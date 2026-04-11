import json

def load_data():
    with open("db_audit_report.json", "r") as f:
        return json.load(f)

def compare_schemas(dev, prod):
    dev_cols = set((row[0], row[1]) for row in dev["columns"])
    prod_cols = set((row[0], row[1]) for row in prod["columns"])
    
    missing_in_prod = dev_cols - prod_cols
    missing_in_dev = prod_cols - dev_cols
    
    # Details check
    dev_col_details = {(row[0], row[1]): row[2:] for row in dev["columns"]}
    prod_col_details = {(row[0], row[1]): row[2:] for row in prod["columns"]}
    
    mismatches = []
    common = dev_cols & prod_cols
    for col in common:
        if dev_col_details[col] != prod_col_details[col]:
            mismatches.append({
                "table": col[0],
                "column": col[1],
                "dev": dev_col_details[col],
                "prod": prod_col_details[col]
            })
            
    return missing_in_prod, missing_in_dev, mismatches

def compare_policies(dev, prod):
    dev_pols = set((p[0], p[1]) for p in dev["policies"])
    prod_pols = set((p[0], p[1]) for p in prod["policies"])
    
    missing_in_prod = dev_pols - prod_pols
    missing_in_dev = prod_pols - dev_pols
    
    return missing_in_prod, missing_in_dev

def run_analysis():
    data = load_data()
    dev = data["dev"]
    prod = data["prod"]
    
    missing_prod_cols, missing_dev_cols, mismatches = compare_schemas(dev, prod)
    missing_prod_pols, missing_dev_pols = compare_policies(dev, prod)
    
    print("## SCHEMA COMPARISON")
    print(f"Missing in PROD columns: {len(missing_prod_cols)}")
    for table, col in sorted(missing_prod_cols):
        print(f"  - {table}.{col}")
        
    print(f"\nMissing in DEV columns: {len(missing_dev_cols)}")
    for table, col in sorted(missing_dev_cols):
        print(f"  - {table}.{col}")
        
    print(f"\nDetails Mismatches: {len(mismatches)}")
    for m in mismatches:
        print(f"  - {m['table']}.{m['column']}: DEV={m['dev']}, PROD={m['prod']}")
        
    print("\n## POLICY COMPARISON")
    print(f"Missing in PROD policies: {len(missing_prod_pols)}")
    for table, pol in sorted(missing_prod_pols):
        print(f"  - {table}: {pol}")
        
    print(f"\nMissing in DEV policies: {len(missing_dev_pols)}")
    for table, pol in sorted(missing_dev_pols):
        print(f"  - {table}: {pol}")

    print("\n## ROW COUNTS (DEV vs PROD)")
    all_tables = set(dev["counts"].keys()) | set(prod["counts"].keys())
    for t in sorted(all_tables):
        d_count = dev["counts"].get(t, "N/A")
        p_count = prod["counts"].get(t, "N/A")
        if d_count != p_count:
            print(f"  - {t}: DEV={d_count}, PROD={p_count}")

    # Index Comparison
    dev_indexes = set((i[0], i[1]) for i in dev["indexes"])
    prod_indexes = set((i[0], i[1]) for i in prod["indexes"])
    missing_prod_idx = dev_indexes - prod_indexes
    missing_dev_idx = prod_indexes - dev_indexes
    
    print("\n## INDEX COMPARISON")
    print(f"Missing in PROD indexes: {len(missing_prod_idx)}")
    for t, i in sorted(missing_prod_idx):
        print(f"  - {t}: {i}")
    
    print(f"\nMissing in DEV indexes: {len(missing_dev_idx)}")
    for t, i in sorted(missing_dev_idx):
        print(f"  - {t}: {i}")

if __name__ == "__main__":
    run_analysis()
