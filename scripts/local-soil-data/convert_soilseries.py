import csv
import re

# !! NOTE !! 
# If you want to run this, you need the input from the database.
# Currently the table with the global soil names, descriptions, and management strings, is wrb_fao90_desc. Here's what I did:

# > docker ps         
#   # Then, copy the id of the running postgres container
# > docker exec -it <postgis_container_id> bash
# > psql -U postgres -d terraso_backend
# > \copy (SELECT * FROM wrb_fao90_desc) TO '~/soilseries_raw.csv' WITH CSV;
#   # This creates a csv file in the docker container. If it succeeds it will say something like "COPY 176"
# > exit
#   # To get out of the database, and back to the bash interface for the docker container
# > docker cp <postgis_container_id>:/root/soilseries_raw.csv <whatever_file_path_on_your_machine>
#   # Then put this script there and run it with:
# > python3 convert_soilseries.py


input_csv = "soilseries_raw.csv"
output_en = "output_en.yaml"
output_es = "output_es.yaml"


def normalize_id(id_str):
    return id_str.strip().lower().replace(" ", "_")


def clean_text(text):
    if not isinstance(text, str):
        return ""
    # Replace <br> and <br/> with \n (case-insensitive)
    text = re.sub(r'\s*<br\s*/?>\s*', r' ', text, flags=re.IGNORECASE)
    # Remove all other HTML tags
    # text = re.sub(r'<[^>]+>', '', text)
    # Escape double quotes
    text = text.replace('"', r'\"')
    return text


with open(input_csv, newline='', encoding='utf-8') as csvfile, open(output_en, "w", encoding='utf-8') as outfile_en, open(output_es, 'w', encoding='utf-8') as outfile_es:
    reader = csv.reader(csvfile)
    for row in reader:
        id = normalize_id(row[0])
        name_en, desc_en, mgmt_en = clean_text(row[1]), clean_text(row[2]), clean_text(row[3])
        name_es, desc_es, mgmt_es = clean_text(row[4]), clean_text(row[5]), clean_text(row[6])
        name_ks, desc_ks, mgmt_ks = row[7], row[8], row[9]
        name_fr, desc_fr, mgmt_fr = row[10], row[11], row[12]
        


        outfile_en.write(f'"{id}": {{\n')
        outfile_en.write(f'    "name": "{name_en}",\n')
        outfile_en.write(f'    "description": "{desc_en}",\n')
        outfile_en.write(f'    "management": "{mgmt_en}"\n')
        outfile_en.write(f'}},\n')
        
        outfile_es.write(f'"{id}": {{\n')
        outfile_es.write(f'    "name": "{name_es}",\n')
        outfile_es.write(f'    "description": "{desc_es}",\n')
        outfile_es.write(f'    "management": "{mgmt_es}"\n')
        outfile_es.write(f'}},\n')


        # outfile_ks.write(f'"{id}":\n')
        # outfile_ks.write(f'    "name": "{name_ks}",\n')
        # outfile_ks.write(f'    "description": "{desc_ks}",\n')
        # outfile_ks.write(f'    "management": "{mgmt_ks}",\n')

        # outfile_fr.write(f'"{id}":\n')
        # outfile_fr.write(f'    "name": "{name_fr}",\n')
        # outfile_fr.write(f'    "description": "{desc_fr}",\n')
        # outfile_fr.write(f'    "management": "{mgmt_fr}",\n')
