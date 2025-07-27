import './style.css'
import { library, dom } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { HomePage } from './pages/Home'
import { renderCreateGame } from './pages/CreateGame'
import { renderJoinGame } from './pages/JoinGame'
import { renderGameRoom } from './pages/GameRoom'

library.add(fas)
dom.i2svg()

function router() {
  const hash = window.location.hash

  if (hash.startsWith('#/create')) {
    renderCreateGame()
  } else if (hash.startsWith('#/join')) {
    renderJoinGame()
  } else if (hash.startsWith('#/room/')) {
    const hashWithoutHash = hash.slice(1)
    const [path, queryString] = hashWithoutHash.split('?')
    const [, , code] = path.split('/')

    const queryParams = new URLSearchParams(queryString)
    const role = queryParams.get('role')

    if (code && (role === 'host' || role === 'player')) {
      renderGameRoom(code, role)
    } else {
      console.error('No se pudo interpretar la URL de la sala')
      window.location.hash = '#/'
    }
  } else {
    HomePage()
  }
}

window.addEventListener('hashchange', router)
router()
