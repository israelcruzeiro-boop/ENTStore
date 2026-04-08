import requests
import sys

TOKEN = "sbp_8211c8d35ba2bd8519cd7f4ae7767f9918799051"
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def list_projects():
    url = "https://api.supabase.com/v1/projects"
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        projects = response.json()
        print("Projetos encontrados:")
        for p in projects:
            print(f"- Nome: {p['name']}, ID/Ref: {p['ref']}, Org: {p['organization_id']}")
    else:
        print(f"Erro ao listar projetos: {response.status_code} - {response.text}")

def check_project(ref):
    url = f"https://api.supabase.com/v1/projects/{ref}"
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        print(f"Sucesso! Projeto {ref} acessível.")
    else:
        print(f"Erro ao acessar {ref}: {response.status_code} - {response.text}")

if __name__ == "__main__":
    list_projects()
    check_project("rmvfegihpkogdvwmmvpj")
