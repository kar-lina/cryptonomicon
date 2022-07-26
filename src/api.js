import { v4 as uuidv4 } from "uuid";

const tickersHandlers = new Map();

const AGGREGATE_INDEX = "5";
const EROR_INDEX = "500";
const MARKET = "CCCAGG";
const USD_SYMBOL = "USD";
const BTC_SYMBOL = "BTC";
let BTC_PRICE = 0;
const tickersPricesInBTC = new Map(); // prices of tickers to BTC
///////////////

// Create a SharedWorker Instance using the worker.js file.
// You need this to be present in all JS files that want access to the socket
//const worker = new SharedWorker(new URL("./worker.js", import.meta.url));
const worker = new SharedWorker("/sharedworker.js");

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
function handleBroadcast(msg) {
  const parsedTickerData = msg.data;
  const type = parsedTickerData.TYPE;
  const newPrice = parsedTickerData.PRICE;
  if (type === EROR_INDEX) {
    const msgFromWS = parsedTickerData.PARAMETER;
    const from = msgFromWS.split("~")[2];
    const to = msgFromWS.split("~")[3];

    if (to === USD_SYMBOL) {
      subscribeToTickerOnWs(from, BTC_SYMBOL);
      //unsubscribeFromTickerOnWs(from, to);
    } else {
      // toCurrency === BTC - no price of ticker in BTC (Invalid Sub)
      const newPrice = "none";
      const handlers = tickersHandlers.get(from) || [];
      handlers.forEach(fn => fn(newPrice));
      //unsubscribeFromTicker(to, BTC_SYMBOL);
    }
  }

  if (type === AGGREGATE_INDEX && newPrice) {
    //const { FROMSYMBOL: currency, TOSYMBOL: toCurrency } = JSON.parse(e.data);
    const currency = parsedTickerData.FROMSYMBOL;
    const toCurrency = parsedTickerData.TOSYMBOL;
    if (toCurrency === BTC_SYMBOL) {
      tickersPricesInBTC.set(currency, newPrice);
      recalculatePrices(currency);
    } else if (currency !== BTC_SYMBOL) {
      // tickers price in USD
      const handlers = tickersHandlers.get(currency) || [];
      handlers.forEach(fn => fn(newPrice));
    } else {
      // price of btc changed
      BTC_PRICE = newPrice;

      const btcHandlers = tickersHandlers.get(currency) || [];
      btcHandlers.forEach(fn => fn(BTC_PRICE));
      recalculatePrices(currency);
      if (!tickersHandlers.size) {
        unsubscribeFromTickerOnWs(BTC_SYMBOL, USD_SYMBOL);
      }
    }
  }
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
///////////////////////
// const socket = new WebSocket(
//   `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
// );
// socket.addEventListener("message", e => {
//   const parsedTickerData = JSON.parse(e.data);
//   const type = parsedTickerData.TYPE;
//   const newPrice = parsedTickerData.PRICE;
//   if (type === EROR_INDEX) {
//     const msgFromWS = JSON.parse(e.data).PARAMETER;
//     const from = msgFromWS.split("~")[2];
//     const to = msgFromWS.split("~")[3];

//     if (to === USD_SYMBOL) {
//       subscribeToTickerOnWs(from, BTC_SYMBOL);
//       //unsubscribeFromTickerOnWs(from, to);
//     } else {
//       // toCurrency === BTC - no price of ticker in BTC (Invalid Sub)
//       const newPrice = "none";
//       const handlers = tickersHandlers.get(from) || [];
//       handlers.forEach(fn => fn(newPrice));
//       //unsubscribeFromTicker(to, BTC_SYMBOL);
//     }
//   }

//   if (type === AGGREGATE_INDEX && newPrice) {
//     console.log(JSON.parse(e.data));
//     //const { FROMSYMBOL: currency, TOSYMBOL: toCurrency } = JSON.parse(e.data);
//     const currency = parsedTickerData.FROMSYMBOL;
//     const toCurrency = parsedTickerData.TOSYMBOL;
//     if (toCurrency === BTC_SYMBOL) {
//       tickersPricesInBTC.set(currency, newPrice);
//       recalculatePrices(currency);
//     } else if (currency !== BTC_SYMBOL) {
//       // tickers price in USD
//       const handlers = tickersHandlers.get(currency) || [];
//       handlers.forEach(fn => fn(newPrice));
//     } else {
//       // price of btc changed
//       BTC_PRICE = newPrice;

//       const btcHandlers = tickersHandlers.get(currency) || [];
//       btcHandlers.forEach(fn => fn(BTC_PRICE));
//       recalculatePrices(currency);
//       if (!tickersHandlers.size) {
//         unsubscribeFromTickerOnWs(BTC_SYMBOL, USD_SYMBOL);
//       }
//     }
//   }
// });

function recalculatePrices(currency) {
  if (BTC_PRICE === 0) {
    subscribeToTickerOnWs(BTC_SYMBOL, USD_SYMBOL);
    return;
  }

  if (!tickersPricesInBTC || tickersPricesInBTC.size === 0) {
    return;
  }
  // for all tickers we have in tickersPricesInBTC call handlers with recalculeted price in USD
  if (currency === BTC_SYMBOL) {
    // if price of BTC changed
    [...tickersPricesInBTC.keys()].forEach(coin => {
      const newPrice = tickersPricesInBTC.get(coin) * BTC_PRICE;
      const handlers = tickersHandlers.get(coin) || [];
      handlers.forEach(fn => fn(newPrice));
    });
  } else {
    //if price of currency in btc changed then we update the price
    const newPrice = tickersPricesInBTC.get(currency) * BTC_PRICE;
    const handlers = tickersHandlers.get(currency) || [];
    handlers.forEach(fn => fn(newPrice));
  }
}

// function sendToWebSocket(message) {
//   const stringifiedMessage = JSON.stringify(message);

//   if (socket.readyState === WebSocket.OPEN) {
//     socket.send(stringifiedMessage);
//     return;
//   }

//   socket.addEventListener(
//     "open",
//     () => {
//       socket.send(stringifiedMessage);
//     },
//     { once: true }
//   );
// }

function subscribeToTickerOnWs(from, to = BTC_SYMBOL) {
  postMessageToWSServer({
    action: "SubAdd",
    subs: [`${AGGREGATE_INDEX}~${MARKET}~${from}~${to}`]
  });
}

function unsubscribeFromTickerOnWs(from, currency = BTC_SYMBOL) {
  //const toCurrency = from === BTC_SYMBOL ? USD_SYMBOL : currency;
  postMessageToWSServer({
    action: "SubRemove",
    subs: [`${AGGREGATE_INDEX}~${MARKET}~${from}~${currency}`]
  });
}

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subscribeToTickerOnWs(ticker, USD_SYMBOL);
};

export const unsubscribeFromTicker = ticker => {
  tickersHandlers.delete(ticker);
  unsubscribeFromTickerOnWs(ticker);
};
