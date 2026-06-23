import os
import ftplib
import requests
import paramiko
from requests.auth import HTTPBasicAuth
from typing import Optional, Dict


# ============================================================
# 🔹 HTTP
# ============================================================

class ProgressFileWrapper:
    def __init__(self, file_path: str, logger, chunk_size: int = 1024 * 1024):
        self.file_path = file_path
        self.file_size = os.path.getsize(file_path)
        self.sent = 0
        self.chunk_size = chunk_size
        self.logger = logger
        self.file = open(file_path, "rb")

    def read(self, size=-1):
        chunk = self.file.read(self.chunk_size if size == -1 else size)
        if chunk:
            self.sent += len(chunk)
            percent = (self.sent / self.file_size) * 100
            self.logger.info(f"[TRANSFER][HTTP] Progreso: {percent:.2f}%")
        return chunk

    def close(self):
        self.file.close()


def transfer_http(
    file_path: str,
    url: str,
    logger,
    bearer_token: Optional[str] = None,
    basic_auth: Optional[Dict[str, str]] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: int = 30,
    verify_ssl: bool = True,
):
    logger.info(f"[TRANSFER][HTTP] Iniciando → {url}")

    if not os.path.exists(file_path):
        raise FileNotFoundError(file_path)

    request_headers = headers.copy() if headers else {}

    if bearer_token:
        request_headers["Authorization"] = f"Bearer {bearer_token}"

    auth = None
    if basic_auth:
        auth = HTTPBasicAuth(
            basic_auth.get("username"),
            basic_auth.get("password"),
        )

    filename = os.path.basename(file_path)
    progress_file = ProgressFileWrapper(file_path, logger)

    try:
        response = requests.post(
            url,
            files={"file": (filename, progress_file, "application/octet-stream")},
            headers=request_headers,
            auth=auth,
            timeout=timeout,
            verify=verify_ssl,
        )

        if response.status_code >= 400:
            logger.error(f"[TRANSFER][HTTP] {response.status_code}: {response.text}")
            response.raise_for_status()

        logger.info(f"[TRANSFER][HTTP] OK")

    finally:
        progress_file.close()


# ============================================================
# 🔹 FTP / FTPS
# ============================================================

def _ensure_ftp_dirs(ftp, remote_dir: str):
    for folder in remote_dir.strip("/").split("/"):
        try:
            ftp.mkd(folder)
        except Exception:
            pass
        ftp.cwd(folder)


def transfer_ftp(
    file_path: str,
    host: str,
    logger,
    username: str,
    password: str,
    remote_dir: str = "",
    port: int = 21,
    use_tls: bool = False,
    passive: bool = True,
    timeout: int = 30,
):
    if not os.path.exists(file_path):
        raise FileNotFoundError(file_path)

    logger.info(f"[TRANSFER][{'FTPS' if use_tls else 'FTP'}] Conectando a {host}")

    ftp = ftplib.FTP_TLS(timeout=timeout) if use_tls else ftplib.FTP(timeout=timeout)
    ftp.connect(host, port)
    ftp.login(username, password)

    if use_tls:
        ftp.prot_p()

    ftp.set_pasv(passive)

    if remote_dir:
        ftp.cwd("/")
        _ensure_ftp_dirs(ftp, remote_dir)

    file_size = os.path.getsize(file_path)
    sent = 0

    def progress(chunk):
        nonlocal sent
        sent += len(chunk)
        percent = (sent / file_size) * 100
        logger.info(f"[TRANSFER][FTP] Progreso: {percent:.2f}%")

    with open(file_path, "rb") as f:
        ftp.storbinary(f"STOR {os.path.basename(file_path)}", f, 1024 * 1024, progress)

    ftp.quit()
    logger.info("[TRANSFER][FTP] OK")


# ============================================================
# 🔹 SFTP (SSH)
# ============================================================

def _ensure_sftp_dirs(sftp, remote_dir: str, logger):
    current = ""
    for folder in remote_dir.strip("/").split("/"):
        current += f"/{folder}"
        try:
            sftp.stat(current)
        except IOError:
            sftp.mkdir(current)
            logger.info(f"[TRANSFER][SFTP] Directorio creado: {current}")


def transfer_sftp(
    file_path: str,
    host: str,
    logger,
    username: str,
    password: Optional[str] = None,
    key_path: Optional[str] = None,
    remote_dir: str = "",
    port: int = 22,
    timeout: int = 30,
):
    if not os.path.exists(file_path):
        raise FileNotFoundError(file_path)

    logger.info(f"[TRANSFER][SFTP] Conectando a {host}:{port}")

    transport = paramiko.Transport((host, port))
    transport.banner_timeout = timeout
    transport.auth_timeout = timeout

    if key_path:
        key = paramiko.RSAKey.from_private_key_file(key_path)
        transport.connect(username=username, pkey=key)
    else:
        transport.connect(username=username, password=password)

    sftp = paramiko.SFTPClient.from_transport(transport)

    if remote_dir:
        _ensure_sftp_dirs(sftp, remote_dir, logger)
        sftp.chdir(remote_dir)

    file_size = os.path.getsize(file_path)
    sent = 0

    def progress(transferred, total):
        percent = (transferred / total) * 100
        logger.info(f"[TRANSFER][SFTP] Progreso: {percent:.2f}%")

    sftp.put(file_path, os.path.basename(file_path), callback=progress)

    sftp.close()
    transport.close()

    logger.info("[TRANSFER][SFTP] OK")
