"""Run makemigrations and migrate, print output to a file."""
import subprocess, sys, os

base = os.path.dirname(os.path.abspath(__file__))
py = os.path.join(base, 'venv', 'bin', 'python3.10')

for cmd in [
    [py, 'manage.py', 'makemigrations', 'rooms', 'sessions'],
    [py, 'manage.py', 'migrate'],
]:
    print(f'\n>>> {" ".join(cmd)}')
    result = subprocess.run(cmd, cwd=base, capture_output=True, text=True)
    print('STDOUT:', result.stdout)
    print('STDERR:', result.stderr)
    print('Return code:', result.returncode)
    if result.returncode != 0:
        sys.exit(result.returncode)

print('\nAll done.')
