const fs = require('fs');
let content = fs.readFileSync('src/pages/GameRoom.ts', 'utf8');

content = content.replace(/const roomDocRef = doc\(db, 'gameRooms', roomResult\.id\)/g, "const roomDocRef = roomResult.id;");
content = content.replace(/const roomRef = doc\(db, 'gameRooms', roomResult\.id\)/g, "const roomRef = roomResult.id;");

content = content.replace(/await updateDoc\(roomRef, \{\n\s+bingoCallers: arrayUnion\(playerName\)\n\s+\}\)/g, "socket.emit('addBingoCaller', roomResult.id, playerName)");

content = content.replace(/await updateDoc\(roomRef, \{ drawnNumbers: \[\] \}\)/g, "socket.emit('updateRoom', roomResult.id, { drawnNumbers: [] })");
content = content.replace(/await updateDoc\(roomRef, \{ maxNumber: parseInt\(value\), drawnNumbers: \[\], currentMode: 'manual', tombolaActive: false, tombolaTarget: null \}\)/g, "socket.emit('updateRoom', roomResult.id, { maxNumber: parseInt(value), drawnNumbers: [], currentMode: 'manual', tombolaActive: false, tombolaTarget: null })");
content = content.replace(/await updateDoc\(roomRef, \{ winnersHistory: \[\] \}\);/g, "socket.emit('updateRoom', roomResult.id, { winnersHistory: [] });");
content = content.replace(/await updateDoc\(roomRef, \{ currentMode: newMode \}\)/g, "socket.emit('updateRoom', roomResult.id, { currentMode: newMode })");

fs.writeFileSync('src/pages/GameRoom.ts', content);
console.log("Refactored GameRoom.ts");
