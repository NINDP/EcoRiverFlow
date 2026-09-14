APP_NAME = EcoRiverFlow

CPP_DIR = cpp
FRONTEND_DIR = frontend
WASM_DIR = $(FRONTEND_DIR)/wasm
BACKEND_DIR = backend
DATABASE_DIR = database

CXX = em++
CXX_STANDARD = -std=c++17
CXX_FLAGS = -O2 --bind \
	-s MODULARIZE=1 \
	-s EXPORT_NAME="EcoRiverModule" \
	-s ALLOW_MEMORY_GROWTH=1

CPP_SOURCES = $(CPP_DIR)/EcoRiverEngine.cpp $(CPP_DIR)/bindings.cpp
WASM_OUTPUT = $(WASM_DIR)/ecoriver.js

DB_NAME = ecoriverflow

.PHONY: all wasm backend install-backend db-reset db-schema db-seed clean help

all: wasm

wasm:
	@echo "Building C++ WebAssembly module..."
	@mkdir -p $(WASM_DIR)
	$(CXX) $(CPP_SOURCES) \
		$(CXX_STANDARD) \
		$(CXX_FLAGS) \
		-o $(WASM_OUTPUT)
	@echo "WASM build completed: $(WASM_OUTPUT)"

backend:
	@echo "Starting backend..."
	cd $(BACKEND_DIR) && npm run dev

install-backend:
	@echo "Installing backend dependencies..."
	cd $(BACKEND_DIR) && npm install

db-reset:
	@echo "Resetting PostgreSQL database..."
	-dropdb $(DB_NAME)
	createdb $(DB_NAME)
	psql $(DB_NAME) < $(DATABASE_DIR)/schema.sql
	psql $(DB_NAME) < $(DATABASE_DIR)/seed.sql
	@echo "Database reset completed."

db-schema:
	@echo "Applying database schema..."
	psql $(DB_NAME) < $(DATABASE_DIR)/schema.sql

db-seed:
	@echo "Seeding database..."
	psql $(DB_NAME) < $(DATABASE_DIR)/seed.sql

clean:
	@echo "Cleaning generated WASM files..."
	rm -rf $(WASM_DIR)/ecoriver.js
	rm -rf $(WASM_DIR)/ecoriver.wasm
	rm -rf $(WASM_DIR)/ecoriver.worker.js
	@echo "Clean completed."

help:
	@echo "$(APP_NAME) commands:"
	@echo "  make wasm             Build C++ logic to WebAssembly"
	@echo "  make backend          Start Express backend"
	@echo "  make install-backend  Install backend dependencies"
	@echo "  make db-reset         Recreate database and load schema + seed"
	@echo "  make db-schema        Apply schema.sql"
	@echo "  make db-seed          Apply seed.sql"
	@echo "  make clean            Remove generated WASM files"