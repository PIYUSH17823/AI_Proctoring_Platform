import asyncio
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    mail_username: str
    mail_password: str
    mail_from: str
    mail_port: int
    mail_server: str
    mail_from_name: str
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

try:
    settings = Settings()
    conf = ConnectionConfig(
        MAIL_USERNAME = settings.mail_username,
        MAIL_PASSWORD = settings.mail_password,
        MAIL_FROM = settings.mail_from,
        MAIL_PORT = settings.mail_port,
        MAIL_SERVER = settings.mail_server,
        MAIL_FROM_NAME = settings.mail_from_name,
        MAIL_STARTTLS = True,
        MAIL_SSL_TLS = False,
        USE_CREDENTIALS = True,
        VALIDATE_CERTS = True
    )

    async def test_mail():
        message = MessageSchema(
            subject="HyrAI SMTP Test",
            recipients=[settings.mail_username],
            body="If you see this, your SMTP configuration is correct!",
            subtype=MessageType.plain
        )
        fm = FastMail(conf)
        await fm.send_message(message)
        print("Test email sent successfully!")

    if __name__ == "__main__":
        asyncio.run(test_mail())
except Exception as e:
    print(f"Error: {e}")
