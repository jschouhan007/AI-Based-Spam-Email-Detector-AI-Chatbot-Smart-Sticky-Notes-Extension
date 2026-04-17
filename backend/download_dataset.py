import os
import urllib.request
import zipfile
import pandas as pd

def download_and_prepare():
    url = "https://archive.ics.uci.edu/ml/machine-learning-databases/00228/smsspamcollection.zip"
    zip_path = "smsspamcollection.zip"
    
    print("Downloading dataset...")
    urllib.request.urlretrieve(url, zip_path)
    
    print("Extracting...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall("data")
        
    print("Formatting to spam.csv...")
    # The dataset uses tab separation: 'label\text'
    df = pd.read_csv('data/SMSSpamCollection', sep='\t', names=['label', 'message'])
    
    # We rename columns to v1 and v2 so it matches the standard format
    df.columns = ['v1', 'v2']
    df.to_csv('spam.csv', index=False)
    
    # Cleanup
    os.remove(zip_path)
    print("Done! spam.csv is ready.")

if __name__ == "__main__":
    download_and_prepare()
