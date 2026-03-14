import requests
import json

url = "https://nominatim.openstreetmap.org/search.php?q=Chhattisgarh+state+India&polygon_geojson=1&format=json"
headers = {
    'User-Agent': 'PrithviNet-App'
}

print("Fetching data from Nominatim...")
response = requests.get(url, headers=headers)

if response.status_code == 200:
    data = response.json()
    if data and len(data) > 0:
        geojson = data[0].get('geojson')
        if geojson:
            out_file = "c:/Users/ASUS/Desktop/tempooo/PrithviNet/Frontend/public/chhattisgarh.json"
            with open(out_file, 'w') as f:
                json.dump(geojson, f)
            print(f"Successfully saved to {out_file}")
        else:
            print("No geojson found in response.")
    else:
        print("Empty response data.")
else:
    print(f"Failed to fetch data: {response.status_code}\n{response.text}")
