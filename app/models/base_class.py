from typing import Any
from sqlalchemy.orm import as_declarative, declared_attr

@as_declarative()
class Base:
    id: Any
    __name__: str
    
    # Generate __tablename__ automatically in lowercase
    @declared_attr
    def __tablename__(cls) -> str:
        # If model name is User, tablename will be users (pluralized or just lowercase)
        # For simplicity in MVP, we can pluralize or keep it simple. Let's map it manually in each class or keep it simple.
        # Let's map tablename manually in each class, but Base class will still support declared_attr for auto fallback.
        name = cls.__name__.lower()
        if name.endswith("y"):
            return name[:-1] + "ies"
        elif not name.endswith("s"):
            return name + "s"
        return name
