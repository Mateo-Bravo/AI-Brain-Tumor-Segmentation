from typing import Optional, Dict
from src.transfer.protocols import (
    transfer_http,
    transfer_ftp,
    transfer_sftp,
)


class TransferService:
    """
    Servicio central de transferencias
    """

    def __init__(
        self,
        logger,

        # HTTP
        http_enabled: bool = False,
        http_url: Optional[str] = None,
        http_bearer_token: Optional[str] = None,
        http_basic_auth: Optional[Dict[str, str]] = None,
        http_headers: Optional[Dict[str, str]] = None,
        http_timeout: int = 30,
        http_verify_ssl: bool = True,

        # FTP / FTPS
        ftp_enabled: bool = False,
        ftp_host: Optional[str] = None,
        ftp_username: Optional[str] = None,
        ftp_password: Optional[str] = None,
        ftp_remote_dir: str = "",
        ftp_port: int = 21,
        ftp_use_tls: bool = False,
        ftp_passive: bool = True,
        ftp_timeout: int = 30,

        # SFTP
        sftp_enabled: bool = False,
        sftp_host: Optional[str] = None,
        sftp_username: Optional[str] = None,
        sftp_password: Optional[str] = None,
        sftp_key_path: Optional[str] = None,
        sftp_remote_dir: str = "",
        sftp_port: int = 22,
        sftp_timeout: int = 30,
    ):
        self.logger = logger

        self.http_enabled = http_enabled
        self.http_url = http_url
        self.http_bearer_token = http_bearer_token
        self.http_basic_auth = http_basic_auth
        self.http_headers = http_headers
        self.http_timeout = http_timeout
        self.http_verify_ssl = http_verify_ssl

        self.ftp_enabled = ftp_enabled
        self.ftp_host = ftp_host
        self.ftp_username = ftp_username
        self.ftp_password = ftp_password
        self.ftp_remote_dir = ftp_remote_dir
        self.ftp_port = ftp_port
        self.ftp_use_tls = ftp_use_tls
        self.ftp_passive = ftp_passive
        self.ftp_timeout = ftp_timeout

        self.sftp_enabled = sftp_enabled
        self.sftp_host = sftp_host
        self.sftp_username = sftp_username
        self.sftp_password = sftp_password
        self.sftp_key_path = sftp_key_path
        self.sftp_remote_dir = sftp_remote_dir
        self.sftp_port = sftp_port
        self.sftp_timeout = sftp_timeout

    def transfer(self, file_path: str):
        if self.http_enabled:
            transfer_http(
                file_path,
                self.http_url,
                self.logger,
                self.http_bearer_token,
                self.http_basic_auth,
                self.http_headers,
                self.http_timeout,
                self.http_verify_ssl,
            )

        if self.ftp_enabled:
            transfer_ftp(
                file_path,
                self.ftp_host,
                self.logger,
                self.ftp_username,
                self.ftp_password,
                self.ftp_remote_dir,
                self.ftp_port,
                self.ftp_use_tls,
                self.ftp_passive,
                self.ftp_timeout,
            )

        if self.sftp_enabled:
            transfer_sftp(
                file_path,
                self.sftp_host,
                self.logger,
                self.sftp_username,
                self.sftp_password,
                self.sftp_key_path,
                self.sftp_remote_dir,
                self.sftp_port,
                self.sftp_timeout,
            )
