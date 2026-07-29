async function readCount() {
    const response = await fetch('/api/count')
    if (!response.ok) throw new Error('Unable to read count')
    return (await response.json() as { count: number }).count
}

async function incrementCount(by: number) {
    const response = await fetch('/api/count', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ incrementBy: by }),
    })
    if (!response.ok) throw new Error('Unable to update count')
}

export { readCount, incrementCount }
