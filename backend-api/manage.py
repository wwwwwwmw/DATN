#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path

# Load .env file
from dotenv import load_dotenv
# Tim .env trong thu muc hien tai hoac thu muc cha
_env_file = Path(__file__).parent / ".env"
if not _env_file.exists():
    _env_file = Path(__file__).parent.parent / ".env"
if _env_file.exists():
    load_dotenv(_env_file)

# GDAL: Use PostGIS-bundled GDAL from PostgreSQL bin
_pg_bin = r'C:\Program Files\PostgreSQL\17\bin'
if _pg_bin not in os.environ.get('PATH', ''):
    os.environ['PATH'] = _pg_bin + os.pathsep + os.environ.get('PATH', '')
if hasattr(os, 'add_dll_directory'):
    os.add_dll_directory(_pg_bin)
os.environ.setdefault('GDAL_DATA', os.path.join(_pg_bin, '..', 'gdal-data'))
os.environ.setdefault('PROJ_LIB', os.path.join(_pg_bin, '..', 'share', 'contrib', 'postgis-3.5', 'proj'))


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()