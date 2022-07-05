//const API_KEY ="9669137d00680684a63615371fe501afec2496b0f5a7126c563c85060700adc1";
import { v4 as uuidv4 } from "uuid";
//import Worker from "worker-loader!./sharedworker.js";

const tickersHandlers = new Map();

// const soket = new WebSocket(
//   `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
// );
//const AGGREGATE_INDEX = "5";

// Create a SharedWorker Instance using the worker.js file.
// You need this to be present in all JS files that want access to the socket
//const worker = new SharedWorker(new URL("./worker.js", import.meta.url));
const worker = Worker();

// Create a unique identifier using the uuid lib. This will help us
// in identifying the tab from which a message was sent. And if a
// response is sent from server for this tab, we can redirect it using
// this id.
const id = uuidv4();

// Connect to the shared worker
worker.port.start();

// Set initial web socket state to connecting. We'll modify this based
// on events.
let webSocketState; //= WebSocket.CONNECTING;
console.log(`Initializing the web worker for user: ${id}`);

// Set an event listener that either sets state of the web socket
// Or handles data coming in for ONLY this tab.
worker.port.onmessage = event => {
  switch (event.data.type) {
    case "WSState":
      webSocketState = event.data.state;
      break;
    case "message":
      handleMessageFromPort(event.data);
      break;
  }
};

// Set up the broadcast channel to listen to web socket events.
// This is also similar to above handler. But the handler here is
// for events being broadcasted to all the tabs.
const broadcastChannel = new BroadcastChannel("WebSocketChannel");
broadcastChannel.addEventListener("message", event => {
  switch (event.data.type) {
    case "WSState":
      webSocketState = event.data.state;
      break;
    case "message":
      handleBroadcast(event.data);
      break;
  }
});

// Listen to broadcasts from server
function handleBroadcast(data) {
  console.log("This message is meant for everyone!");
  console.log(data);
}

// Handle event only meant for this tab
function handleMessageFromPort(data) {
  console.log(`This message is meant only for user with id: ${id}`);
  console.log(data);
}

// Use this method to send data to the server.
function postMessageToWSServer(input) {
  if (webSocketState === WebSocket.CONNECTING) {
    console.log("Still connecting to the server, try again later!");
  } else if (
    webSocketState === WebSocket.CLOSING ||
    webSocketState === WebSocket.CLOSED
  ) {
    console.log("Connection Closed!");
  } else {
    //worker.port.postMessage(input);
    worker.port.postMessage({
      //Include the sender information as a uuid to get back the response
      from: id,
      data: input
    });
  }
}

// Sent a message to server after approx 2.5 sec. This will
// give enough time to web socket connection to be created.
//setTimeout(() => postMessageToWSServer("Initial message"), 2500);

/////////////////////////////////////////////////////////////////////////////////////

// function sendToWebSocket(message) {
//   const stringifiedMessage = JSON.stringify(message);

//   if (soket.readyState === WebSocket.OPEN) {
//     soket.send(stringifiedMessage);
//     return;
//   }

//   soket.addEventListener(
//     "open",
//     () => {
//       soket.send(stringifiedMessage);
//     },
//     { once: true }
//   );
// }

// soket.addEventListener("message", (e) => {
//   const {
//     TYPE: type,
//     FROMSYMBOL: currency,
//     PRICE: newPrice,
//   } = JSON.parse(e.data);
//   if (type !== AGGREGATE_INDEX || newPrice === undefined) {
//     return;
//   }

//   const handlers = tickersHandlers.get(currency) ?? [];
//   handlers.forEach((fn) => fn(newPrice));
// });

function subscribeToTickerOnWs(ticker) {
  postMessageToWSServer({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
}
function unsubscribeToTickerOnWs(ticker) {
  postMessageToWSServer({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
}
export const subscribeToTicker = (tickerName, cb) => {
  const subscribers = tickersHandlers.get(tickerName) || [];
  tickersHandlers.set(tickerName, [...subscribers, cb]);
  subscribeToTickerOnWs(tickerName);
};

export const unsubscribeFromTicker = (tickerName, cb) => {
  const subscribers = tickersHandlers.get(tickerName) || [];
  tickersHandlers.set(
    tickerName,
    subscribers.filter(fn => fn != cb)
  );
  unsubscribeToTickerOnWs(tickerName);
};
