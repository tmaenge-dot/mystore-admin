# Makefile for common dev tasks
DEV_SCRIPT=./scripts/dev-safe.sh
SERVICE_TEMPLATE=misc/mystore.service
UNITNAME=mystore@$(USER).service

.PHONY: dev start stop install-service generate-unit prepare-history-purge

dev:
	@$(DEV_SCRIPT)

start:
	@node server.js &

stop:
	@-pkill -f "node server.js" || true

generate-unit:
	@bash ./scripts/generate-systemd-unit.sh $(USER)

install-service:
	@echo "To install the systemd service, run:"
	@echo "  sudo cp misc/mystore.service /etc/systemd/system/$(UNITNAME)"
	@echo "  sudo systemctl daemon-reload && sudo systemctl enable --now $(UNITNAME)"

prepare-history-purge:
	@bash ./scripts/prepare-history-purge.sh --dry-run
