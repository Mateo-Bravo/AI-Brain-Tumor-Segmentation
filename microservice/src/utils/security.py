from fastapi import Header, HTTPException, status
from src.utils.settings import API_KEY, JWT_SECRET, JWT_ALGORITHM
import jwt

# =============================
# AUTENTICACIÓN CON API KEY
# =============================
async def verify_api_key(x_api_key: str = Header(None)):
    """
    Verifica el encabezado x-api-key.
    """
    if not x_api_key or x_api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key inválida o faltante",
        )
    return {"auth_type": "api_key"}


# =============================
# AUTENTICACIÓN CON JWT
# =============================
def create_jwt_token(payload: dict):
    """
    Genera un token JWT.
    """
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def verify_jwt_token(authorization: str = Header(None)):
    """
    Verifica el JWT enviado en el header Authorization: Bearer <token>.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token JWT no proporcionado"
        )

    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"auth_type": "jwt", "user": payload.get("sub")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


# =============================
# AUTENTICACIÓN COMBINADA (API Key o JWT)
# =============================
async def verify_authentication(
    x_api_key: str = Header(None),
    authorization: str = Header(None)
):
    """
    Permite autenticarse con API Key o JWT indistintamente.
    Si cualquiera es válido, la petición se acepta.
    """
    # Primero intenta validar por API Key
    if x_api_key and x_api_key == API_KEY:
        return {"auth_type": "api_key"}

    # Si no hay API Key, intenta JWT
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return {"auth_type": "jwt", "user": payload.get("sub")}
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expirado")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Token inválido")

    # Si ninguno está presente o válido
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Autenticación requerida (API Key o JWT)"
    )
