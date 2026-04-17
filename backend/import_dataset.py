import pandas as pd
import os

def merge_datasets():
    print("Loading original spam.csv...")
    base_df = pd.read_csv('spam.csv') # expects v1, v2
    
    # Load first extra dataset
    path1 = r"D:\4th Sem\AI_RMS_chatbot\New folder\mail_data.csv"
    if os.path.exists(path1):
        print(f"Loading {path1}...")
        try:
            df1 = pd.read_csv(path1)
            # Assuming columns: Category (ham/spam), Message
            df1 = df1.rename(columns={'Category': 'v1', 'Message': 'v2'})
            base_df = pd.concat([base_df, df1[['v1', 'v2']]], ignore_index=True)
            print("Successfully concatenated mail_data.csv")
        except Exception as e:
            print(f"Error loading {path1}: {e}")
            
    # Load second extra dataset
    path2 = r"D:\4th Sem\AI_RMS_chatbot\New folder\mailss.csv"
    if os.path.exists(path2):
        print(f"Loading {path2}...")
        try:
            df2 = pd.read_csv(path2)
            # Assuming columns: text, spam (0/1)
            # We need to map 0 -> ham, 1 -> spam
            df2['v1'] = df2['spam'].map({0: 'ham', 1: 'spam', '0': 'ham', '1': 'spam'})
            df2['v2'] = df2['text']
            base_df = pd.concat([base_df, df2[['v1', 'v2']]], ignore_index=True)
            print("Successfully concatenated mailss.csv")
        except Exception as e:
            print(f"Error loading {path2}: {e}")

    # Load third extra dataset
    path3 = r"D:\4th Sem\AI_RMS_chatbot\New folder\datamail.csv"
    if os.path.exists(path3):
        print(f"Loading {path3}...")
        try:
            df3 = pd.read_csv(path3)
            # Columns: label (0/1), text
            df3['v1'] = df3['label'].map({0: 'ham', 1: 'spam', '0': 'ham', '1': 'spam'})
            df3['v2'] = df3['text']
            base_df = pd.concat([base_df, df3[['v1', 'v2']]], ignore_index=True)
            print("Successfully concatenated datamail.csv")
        except Exception as e:
            print(f"Error loading {path3}: {e}")

    print(f"Total rows before deduplication: {len(base_df)}")
    base_df = base_df.drop_duplicates(subset=['v2'])
    print(f"Total rows after deduplication: {len(base_df)}")
    
    # Drop nas
    base_df = base_df.dropna(subset=['v1', 'v2'])
    
    # Standardize classes to lower case
    base_df['v1'] = base_df['v1'].str.lower()
    base_df = base_df[base_df['v1'].isin(['ham', 'spam'])]
    
    base_df.to_csv('spam.csv', index=False)
    print("Datasets successfully merged into spam.csv!")
    
    print("Retraining model with new massive dataset...")
    from train_model import train
    train()

if __name__ == "__main__":
    merge_datasets()
