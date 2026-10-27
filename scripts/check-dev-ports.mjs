import net from 'node:net'

function checkPort(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', error => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`El puerto ${port} ya está en uso. Cierra la otra instancia de Bingo con Ctrl+C antes de ejecutar npm run dev.`))
      } else {
        reject(new Error(`No se pudo comprobar el puerto ${port}: ${error.message}`))
      }
    })
    server.listen(port, () => server.close(error => error ? reject(error) : resolve()))
  })
}

try {
  await checkPort(4001)
  await checkPort(5173)
} catch (error) {
  console.error(`\nNo se inició el entorno local: ${error.message}\n`)
  process.exitCode = 1
}
