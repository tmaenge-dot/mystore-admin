Installing the MyStore systemd service

This document shows how to install the provided `misc/mystore.service` unit as a systemd service on a Linux machine.

Important: these steps require sudo/root privileges. Do not run them inside the repository unless you understand the effects.

Simple install (per-user, replace <user> with your username):

1. Copy the unit file to systemd system units (example):

   sudo cp misc/mystore.service /etc/systemd/system/mystore@<user>.service

2. Reload systemd and enable/start the service:

   sudo systemctl daemon-reload
   sudo systemctl enable --now mystore@<user>.service

3. Check status:

   sudo systemctl status mystore@<user>.service
   sudo journalctl -u mystore@<user>.service -f

Notes:
- The unit uses `User=%i` and `WorkingDirectory=/home/%i/mystore-admin`. For system-wide installs, edit the unit and set `User=someuser` and `WorkingDirectory` explicitly.
- The unit assumes `node` is available via /usr/bin/env node and that dependencies are installed in the repo directory (`npm install`).
- To stop and disable:

   sudo systemctl disable --now mystore@<user>.service

Security:
- Consider running behind a reverse proxy (nginx) and setting up TLS.
- Use a process manager or a container for production if you prefer more isolation.

If you want, I can generate a non-template unit (with your username filled in) and instructions to create a systemd socket/unit pair for socket activation. I will not run any systemctl commands for you — you need to run them with sudo.
