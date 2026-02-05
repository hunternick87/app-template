import axios from 'axios'

async function readCount() {
    const response = await axios.get('/api/count')
    return response.data.count as number
}

async function incrementCount(by: number) {
    await axios.post('/api/count', { incrementBy: by })
}

export { readCount, incrementCount }