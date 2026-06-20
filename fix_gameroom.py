import os
import re

with open('src/pages/GameRoom.ts', 'r') as f:
    content = f.read()

# 1. Change setupHostControlsListeners signature
content = content.replace("async function setupHostControlsListeners(roomId: string) {", "async function setupHostControlsListeners(roomData: GameRoom) {")
content = content.replace("const roomRef = doc(db, 'gameRooms', roomId)", "")
content = content.replace("setupHostControlsListeners(roomResult.id)", "setupHostControlsListeners(roomData)")

# 2. Reset Button
content = re.sub(r"const snapshot = await getDoc\(roomRef\)\n\s*const room = snapshot\.data\(\) as GameRoom\n\s*if \(room\.drawnNumbers\.length === 0\) return", "if (roomData.drawnNumbers.length === 0) return", content)

# 3. Config Button
content = re.sub(r"const snapshot = await getDoc\(roomRef\)\n\s*const room = snapshot\.data\(\) as GameRoom", "const room = roomData", content)

# 4. Winners History Button
# It also uses getDoc
content = re.sub(r"const snapshot = await getDoc\(roomRef\)\n\s*const room = snapshot\.data\(\) as GameRoom", "const room = roomData", content)

# 5. Toggle Mode Button
content = re.sub(r"const snapshot = await getDoc\(roomRef\)\n\s*const room = snapshot\.data\(\) as GameRoom", "const room = roomData", content)

# 6. Any other stray doc/db/getDoc
content = re.sub(r"const roomRef = doc\(db, 'gameRooms', roomResult\.id\)", "", content)

# 7. Replace any stray roomResult.id in updateRoom calls inside setupHostControlsListeners to roomData.id
content = content.replace("socket.emit('updateRoom', roomResult.id", "socket.emit('updateRoom', roomData.id")
content = content.replace("socket.emit('updateRoom', roomId", "socket.emit('updateRoom', roomData.id")

with open('src/pages/GameRoom.ts', 'w') as f:
    f.write(content)

print("Fixed GameRoom.ts completely")
