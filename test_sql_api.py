import requests
import json

TOKEN = "sbp_8211c8d35ba2bd8519cd7f4ae7767f9918799051"
REF = "rmvfegihpkogdvwmmvpj"

sql = """
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS checklists_enabled BOOLEAN DEFAULT FALSE;
"""

url = f"https://api.supabase.com/v1/projects/{REF}/database/query"
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

data = {
    "query": sql
}

response = requests.post(url, headers=headers, json=data)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
