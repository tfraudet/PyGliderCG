<p align="center">
	 <img src="img/app-logo-short-v2.png" width="100" >
</p>

 # Center of Gravity Calculator for ACPH Gliders

A simple Streamlit app to calculate center of gravity for [ACPH](https://aeroclub-issoire.fr/) gliders.

[![Open in Streamlit](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://glider-cg.streamlit.app/)

## Requirements

* Python 3.11

## How to run it on your own machine

We suggest you to create a virtual environment for running this app with Python 3. Clone this repository and open your terminal/command prompt in a folder.

```bash
git clone https://github.com/tfraudet/PyGliderCG.git
cd ./PyGliderCG
python3 -m venv .venv
```

On Unix systems

```bash
source .venv/bin/activate
```

On Window systems

```bash
.venv\scripts\activate
```

### Install the requirements

```bash
pip install -r requirements.txt
```

### Run the app

```bash
streamlit run streamlit_app.py
```

## How to run it locally using docker (build image)

```bash
# First build the image from dockerfile
docker build --tag tfraudet/pyglidercg --file './Dockerfile' .

# Or pull the image from docker hub
docker pull tfraudet/pyglidercg:latest

# Then run the image inside a container, mapping the host’s port 8501 to the container’s port 8501
docker run -d -p 8501:8501 --name glider-cg  -e APP_DEBUG_MODE='false' -e DB_NAME='./data/gliders.db' -v "$(pwd)"/data:/app/data tfraudet/pyglidercg:latest

```

## Utility to import PP2 application data

PP2 or 'Pesée des Planeurs v2" is and old WinDev application develop by the [GNAV](https://www.g-nav.org/) to calculate weights and balance for gliders. You can import database from this application using the following steps:

1. Convert all PP2 database files ```<filename>.fic```  that you want to recover using [HFDA tool](https://lapalys.ca/logiciels/hfda/) and save it as excel files.
2. Import converted excel files using ```pp2_import``` cli utility

To run pp2_import utility:

```bash
# import pp2 file FicPlaneur.fic previously converted to excel using HFDA
python pp2_import.py ./data/pp2_recovery/FicPlaneur.xls

# Get help of the cli
python pp2_import.py --help
```
