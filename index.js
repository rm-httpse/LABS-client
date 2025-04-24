import { promisify } from 'util'
import { exec } from 'child_process'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()


const execAsync = promisify(exec)

// URL de tu microservicio de proveedores
const providerURL = process.env.URL
const proxyPort = process.env.SOCKS5_PROXY_PORT || 1080
// const proxyUsername = process.env.PROXY_USERNAME
// const proxyPassword = process.env.PROXY_PASSWORD
const maxTries = process.env.MAX_TRIES || 10;

let [proxyIp, IP, interf, connected, canceled, childTries] = [null, null, null, false, false, 0]
const getActiveInterface = async () => {
  try {
    const { stdout } = await execAsync('route get default')
    const match = stdout.match(/interface: (\w+)/)
    return match ? match[1] : null
  } catch (err) {
    console.error('Error obteniendo interfaz activa:', err.message)
    return null
  }
}

const configureProxy = async () => {
  try {
    await execAsync(`networksetup -setsocksfirewallproxy Wi-Fi ${IP} ${proxyPort}`)
    await execAsync(`networksetup -setsocksfirewallproxystate Wi-Fi on`)
    console.log(`✅ Proxy configurado: ${IP}:${proxyPort}`)
    connected = true;
  } catch (err) {
    console.error('❌ Error configurando el proxy:', err.message)
    await execAsync('sleep 1');
  }
}

const removeProxy = async () => {
  try {
    await execAsync(`networksetup -setsocksfirewallproxystate Wi-Fi off`)
    console.log('🧹 Proxy eliminado del sistema')
  } catch (err) {
    console.error('❌ Error removiendo el proxy:', err.message)
    await execAsync('sleep 1');
  }
}

const handleExit = async () => {
  console.log('handling exit...')
  try {
    await removeProxy();
    console.log('YOOOOOOOO exit is successful')
    process.exit(0)
  } catch(e) {
    console.log(`bro some shi happened: ${e}`)
    process.exit(1)
  }
}

while(!IP) {
  try {
    const IPresponse = await fetch(providerURL)
    const IPdata = await IPresponse.json()
    
    if (IPdata && IPdata.ip) {
      console.log('Provider IP:', IPdata.ip)
      IP = IPdata.ip;
    } else {
      throw new Error('No provider IP available')
    }
  } catch (error) {
    console.error('Error getting provider IP:', error)
    await execAsync('sleep 1');
  }
}

while (!interf) {
  try {
    interf = await getActiveInterface();
  } catch(e) {
    console.error(e)
    await execAsync('sleep 1');
  }
}

while(!connected && !canceled) {
  try {
    await configureProxy();
  } catch(e) {
    console.error(e)
    await execAsync('sleep 1');
  }
}

process.stdin.setRawMode(true)
process.stdin.resume()
process.stdin.setEncoding('utf8')

process.on('exit', (code) => {
  console.log(`🚪 Saliendo con código: ${code}`)
  handleExit();
})

process.stdin.on('data', (key) => {
  if (key === 'e') {
    console.log('clean ending...')
    handleExit();
  }
  console.log(`🟡 Tecla presionada: ${key}`)
})

