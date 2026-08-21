import os
import time
import uuid


def generate_uuid7() -> str:
    """Generate a time-ordered UUIDv7 string (RFC 9562).

    Layout:
    - 48 bits: Unix timestamp in milliseconds
    - 4 bits: Version (0111)
    - 12 bits: Pseudo-random bits
    - 2 bits: Variant (10)
    - 62 bits: Cryptographic pseudo-random bits
    """
    now_ms = int(time.time() * 1000)
    rand_bytes = os.urandom(10)

    # 48-bit big-endian timestamp
    ts_bytes = now_ms.to_bytes(6, "big")

    # 4-bit version (0x7) + 12-bit rand
    rand_a = int.from_bytes(rand_bytes[0:2], "big") & 0x0FFF
    b6 = (0x70 | (rand_a >> 8)) & 0xFF
    b7 = rand_a & 0xFF

    # 2-bit variant (0x80) + 62-bit rand
    b8 = (0x80 | (rand_bytes[2] & 0x3F)) & 0xFF
    node_bytes = rand_bytes[3:10]

    raw_bytes = ts_bytes + bytes([b6, b7, b8]) + node_bytes
    return str(uuid.UUID(bytes=raw_bytes))
