from pydantic import BaseModel
from typing import Optional, Dict


class HTTPTransferConfig(BaseModel):
    enabled: bool = False
    url: Optional[str] = None
    bearer_token: Optional[str] = None
    basic_auth: Optional[Dict[str, str]] = None
    headers: Optional[Dict[str, str]] = None
    timeout: int = 30
    verify_ssl: bool = True


class FTPTransferConfig(BaseModel):
    enabled: bool = False
    host: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    remote_dir: str = ""
    port: int = 21
    use_tls: bool = False
    passive: bool = True
    timeout: int = 30


class SFTPTransferConfig(BaseModel):
    enabled: bool = False
    host: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    key_path: Optional[str] = None
    remote_dir: str = ""
    port: int = 22
    timeout: int = 30


class TransferConfig(BaseModel):
    http: HTTPTransferConfig = HTTPTransferConfig()
    ftp: FTPTransferConfig = FTPTransferConfig()
    sftp: SFTPTransferConfig = SFTPTransferConfig()
