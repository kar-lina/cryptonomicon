<template>
  <div class="container mx-auto flex flex-col items-center bg-gray-100 p-4">
    <div class="container">
      <div class="w-full my-4"></div>
      <add-ticker
        @add-ticker="add"
        :disabled="tooManyTickersAdded"
        :tickers="tickers"
      />
      <template v-if="tickers.length">
        <hr class="w-full border-t border-gray-600 my-4" />
        <div>
          <button
            v-if="hasNextPage"
            @click="page = page + 1"
            class="
              my-4
              mx-4
              inline-flex
              items-center
              py-2
              px-4
              border border-transparent
              shadow-sm
              text-sm
              leading-4
              font-medium
              rounded-full
              text-white
              bg-gray-600
              hover:bg-gray-700
              transition-colors
              duration-300
              focus:outline-none
              focus:ring-2
              focus:ring-offset-2
              focus:ring-gray-500
            "
          >
            Вперед
          </button>
          <button
            v-if="page > 1"
            @click="page = page - 1"
            class="
              my-4
              mx-4
              inline-flex
              items-center
              py-2
              px-4
              border border-transparent
              shadow-sm
              text-sm
              leading-4
              font-medium
              rounded-full
              text-white
              bg-gray-600
              hover:bg-gray-700
              transition-colors
              duration-300
              focus:outline-none
              focus:ring-2
              focus:ring-offset-2
              focus:ring-gray-500
            "
          >
            Назад
          </button>
          <div>Фильтр: <input v-model="filter" @input="page = 1" /></div>
        </div>
        <hr class="w-full border-t border-gray-600 my-4" />
        <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div
            class="
            
              overflow-hidden
              shadow
              rounded-lg
              border-purple-800 border-solid
              cursor-pointer
            "
            v-for="t in paginatedTickers"
            :key="t.name"
            @click="selectTicker(t)"
            :class="{
              'border-4': selectedTicker === t,
              'bg-white': isNormalPrice(t),
              'bg-red-100': !isNormalPrice(t)
            }"
          >
            <div class="px-4 py-5 sm:p-6 text-center">
              <dt class="text-sm font-medium text-gray-500 truncate">
                {{ t.name }} - USD
              </dt>
              <dd class="mt-1 text-3xl font-semibold text-gray-900">
                {{ formattedPrice(t.price) }}
              </dd>
            </div>
            <div class="w-full border-t border-gray-200"></div>
            <button
              @click.stop="deleteTickerHandler(t)"
              class="
                flex
                items-center
                justify-center
                font-medium
                w-full
                bg-gray-100
                px-4
                py-4
                sm:px-6
                text-md text-gray-500
                hover:text-gray-600 hover:bg-gray-200 hover:opacity-20
                transition-all
                focus:outline-none
              "
            >
              <svg
                class="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="#718096"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                ></path></svg
              >Удалить
            </button>
          </div>
        </dl>
        <hr class="w-full border-t border-gray-600 my-4" />
      </template>
      <Graph
        v-if="selectedTicker"
        :selTicker="selectedTicker"
        :dynamicPrices="graph"
        @unselect-ticker="selectedTicker = null"
        @delete-graph-elements="removeExtraPrices"
      ></Graph>
    </div>
  </div>
</template>

<script>
import { subscribeToTicker } from "./api";
import { unsubscribeFromTicker } from "./api";
import { loadLstOfCoins, getTickers } from "./local-storage-manager.js";

import AddTicker from "./components/AddTicker.vue";
import Graph from "./components/Graph.vue";
const TICKERS_PER_PAGE = 6;

export default {
  name: "App",
  components: {
    AddTicker,
    Graph
  },

  data() {
    return {
      tickers: [],

      selectedTicker: null,
      graph: [],
      maxGraphElements: 1,
      filter: "",
      page: 1
    };
  },

  created() {
    const url = new URL(window.location);
    const windowData = Object.fromEntries(url.searchParams.entries());

    if (windowData.filter) {
      this.filter = windowData.filter;
    }
    if (windowData.page) {
      this.page = windowData.page;
    }

    this.tickers = getTickers("coinList");

    this.tickers?.forEach(ticker => {
      subscribeToTicker(ticker.name, newPrice => {
        this.updateTickers(ticker.name, newPrice);
      });
    }),
      loadLstOfCoins();
  },
  mounted() {
    window.addEventListener("storage", e => {
      this.handleStorageEvent(e);
    });
  },
  beforeUnmount() {
    window.removeEventListener("storage", e => {
      this.handleStorageEvent(e);
    });
  },

  computed: {
    allCoins() {
      return getTickers("allCoins");
    },
    matchingTickers() {
      const coins = this.allCoins;

      let match = [];
      for (let c in coins) {
        if (
          c.startsWith(this.ticker.toLocaleLowerCase()) ||
          coins[c].startsWith(this.ticker.toLocaleLowerCase())
        ) {
          match.push(c);
        }
        if (match.length == 4) {
          return match;
        }
      }

      return match;
    },
    startIndex() {
      return (this.page - 1) * TICKERS_PER_PAGE;
    },

    endIndex() {
      return this.page * TICKERS_PER_PAGE;
    },

    filteredTickers() {
      return this.tickers.filter(ticker => ticker.name.includes(this.filter));
    },

    paginatedTickers() {
      return this.filteredTickers.slice(this.startIndex, this.endIndex);
    },

    hasNextPage() {
      return this.filteredTickers.length > this.endIndex;
    },

    pageStateOptions() {
      return {
        page: this.page,
        filter: this.filter
      };
    },
    tooManyTickersAdded() {
      return this.tickers.length > 4;
    }
  },

  methods: {
    isNormalPrice(t) {
      return t.price !== "none";
    },
    formattedPrice(price) {
      if (typeof price === "string" || price === undefined) {
        return "-";
      }
      return price > 1 ? price.toFixed(2) : price.toPrecision(2);
    },

    updateTickers(tickerName, price) {
      this.tickers
        .filter(ticker => ticker.name === tickerName)
        .forEach(t => {
          if (t === this.selectedTicker) {
            this.graph.push(price);
          }
          t.price = price;
        });
    },

    add(ticker) {
      if (this.tickerIsAdded) {
        return;
      }
      const currentTicker = {
        name: ticker.toLocaleUpperCase(),
        price: "-"
      };

      this.tickers = [...this.tickers, currentTicker];
      this.filter = "";

      subscribeToTicker(currentTicker.name, newPrice => {
        this.updateTickers(currentTicker.name, newPrice);
      });
    },

    deleteTickerHandler(tickerToRemove) {
      this.tickers = this.tickers.filter(t => t !== tickerToRemove);
      unsubscribeFromTicker(tickerToRemove.name);

      if (this.selectedTicker?.name === tickerToRemove.name) {
        this.selectedTicker = null;
      }
    },

    selectTicker(ticket) {
      this.selectedTicker = ticket;
    },

    handleStorageEvent(event) {
      if (event.key != "coinList") return;
      this.tickers = JSON.parse(event.newValue);

      this.tickers?.forEach(ticker => {
        subscribeToTicker(ticker.name, newPrice => {
          this.updateTickers(ticker.name, newPrice);
        });
      });
    },
    removeExtraPrices(deletedPrices) {
      this.graph.splice(0, deletedPrices);
    }
  },
  watch: {
    filter() {
      this.page = 1;
    },
    pageStateOptins(v) {
      window.history.pushState(
        null,
        document.title,
        `${window.location.pathname}?filter=${v.filter}&page=${v.page}`
      );
    },
    selectedTicker() {
      this.graph = [];
    },
    tickers() {
      localStorage.setItem("coinList", JSON.stringify(this.tickers));
    },
    paginatedTickers() {
      if (this.paginatedTickers.length === 0 && this.page > 1) {
        this.page -= 1;
      }
    }
  }
};
</script>
