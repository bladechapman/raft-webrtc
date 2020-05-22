import { createUUID } from './lib/uuid';
import { RtcBidirectionalDataChannel, RtcBidirectionalDataChannelDelegate } from './rtc';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM READY');
    main();
});


function main() {
    const uuid = createUUID();
    const channel = new RtcBidirectionalDataChannel(uuid, {
        channelOpened: () => {},
        messageReceived: (m) => { console.log(m) }
    });

    (window as any).start = () => {
        console.log('START')
        channel.createOffer();
    }

    (window as any).send = () => {
        const submissionElem = document.getElementById('submission') as HTMLInputElement;
        if (submissionElem) {
            const text = submissionElem.value;
            channel.send(text);
        }
    }
}
