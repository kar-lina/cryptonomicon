export const loadLstOfCoins = () => {
  fetch("https://min-api.cryptocompare.com/data/all/coinlist?summary=true")
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      const coins = {};
      for (let coin in data.Data) {
        coins[coin] = data.Data[coin].FullName;
      }

      localStorage.setItem("allCoins", JSON.stringify(coins));
    });
};

export const getTickers = (key) => {
  return JSON.parse(localStorage.getItem(key));
};
