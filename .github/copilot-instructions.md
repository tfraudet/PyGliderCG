# Project Overview

PyGliderCG is a web application for calculating and managing center of gravity (CG) data for gliders. It provides:
- CG calculation tools for pilots and technicians
- Administrative interface for managing glider database
- Weight and balance documentation management

## Folder Structure

- `/backend`: FastAPI service (API, auth, data access)
- `/frontend`: Streamlit application (main app, pages, client modules)
- `/frontend/img`: Application images and icons
- `/frontend/pages`: Streamlit multipage screens
- `/data`: DuckDB database files and import/export directories
- `/doc`: Technical documentation for CG calculations and weight/balance procedures
- `/e2e`: End-to-end tests written in TypeScript using Playwright
- `/tests`: Unit tests using pytest
- `/logo`: Logo source files and design assets
- `/spike`: Technical prototypes and experimental code

## Technologies

- **Frontend**: Streamlit for web interface and user interactions
- **Database**: DuckDB for efficient data storage and queries
- **Visualization**: Plotly for interactive charts and diagrams
- **Testing**: 
  - Playwright (TypeScript) for E2E testing
  - Pytest for Python unit testing

## Coding Standards

- Indentation: Use tabs (not spaces)
- Strings: Use single quotes
- Python: Follow PEP 8 style guide
- TypeScript: Use strict mode and type annotations

## UI Guidelines

- Use Streamlit's built-in components when possible
- Keep interface clean and intuitive for aviation professionals
- Ensure all numerical inputs have proper validation
- Display units consistently (metric system)
