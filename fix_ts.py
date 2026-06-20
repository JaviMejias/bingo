import os
import re

def fix_controls():
    with open('src/components/BingoControls.ts', 'r') as f:
        content = f.read()
    
    # Remove unused roomRef
    content = re.sub(r"const roomRef = doc\(db, 'gameRooms', room\.id\)\n\s*", "", content)
    
    with open('src/components/BingoControls.ts', 'w') as f:
        f.write(content)

def fix_gameroom():
    with open('src/pages/GameRoom.ts', 'r') as f:
        content = f.read()

    # remove doc, db, getDoc
    content = re.sub(r"const roomRef = doc\(db, 'gameRooms', roomResult\.id\)\n\s*", "", content)
    content = re.sub(r"const roomRef = roomResult\.id;\n\s*", "", content)
    content = re.sub(r"const roomDocRef = roomResult\.id;\n\s*", "", content)
    
    content = re.sub(r"const snapshot = await getDoc\(roomRef\)\n\s*const latestData = snapshot.data\(\) as GameRoom", "const latestData = updatedRoom", content)
    
    content = re.sub(r"const snapshot = await getDoc\(roomRef\);\n\s*const room = snapshot.data\(\) as GameRoom;", "const room = updatedRoom;", content)

    # Replace getDoc and replace roomResult.id with updatedRoom.id (or roomData.id)
    # The variable updatedRoom might not be in scope for those event listeners outside onSnapshot.
    # Actually, in renderGameRoom, we have roomData. We should use roomData.id instead of roomResult.id since roomResult.id is the same.
    content = content.replace("roomResult.id", "roomData.id")

    with open('src/pages/GameRoom.ts', 'w') as f:
        f.write(content)

fix_controls()
fix_gameroom()
print("Fixed TS errors")
