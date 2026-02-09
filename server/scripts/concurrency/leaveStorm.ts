
import generateTokens from "../generateTokens";


async function leaveStorm() {
    const tokens = await generateTokens()
    const queueId = 32

    const requests = tokens.map((token) =>
        fetch(`http://localhost:8080/api/v1/queues/${queueId}/leave`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },

        })
    );
    console.log(`Firing ${requests.length} concurrent leave requests...`);

    const responses = await Promise.all(requests);

    let success = 0;
    let failed = 0;

    for (const res of responses) {
        if (res.ok) success++;
        else {
            failed++;
            console.log("Fail status:", res.status);
            try {
                console.log(await res.text());
            } catch { }
        }
    }

    console.log("Leave storm complete:");
    console.log("Success:", success);
    console.log("Failed:", failed);
}

leaveStorm().catch(console.error)