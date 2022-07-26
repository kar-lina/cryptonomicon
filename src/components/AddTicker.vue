<template>
  <section>
    <div class="flex">
      <div class="max-w-xs">
        <label for="wallet" class="block text-sm font-medium text-gray-700"
          >Тикер
        </label>
        <div class="mt-1 relative rounded-md shadow-md">
          <input
            v-model="ticker"
            type="text"
            name="wallet"
            id="wallet"
            @keydown.enter="add"
            :disabled="disabled"
            class="
                  block
                  w-full
                  pr-10
                  border-gray-300
                  text-gray-900
                  focus:outline-none focus:ring-gray-500 focus:border-gray-500
                  sm:text-sm
                  rounded-md
                "
            placeholder="Например DOGE"
          />
        </div>
        <template v-if="matchingTickers">
          <div class="flex bg-white p-1 rounded-md shadow-md flex-wrap">
            <button
              v-for="(coin, idx) in matchingTickers"
              :key="idx"
              @click="(ticker = coin), add()"
              class="
                    inline-flex
                    items-center
                    px-2
                    m-1
                    rounded-md
                    text-xs
                    font-medium
                    bg-gray-300
                    text-gray-800
                    cursor-pointer
                  "
            >
              {{ coin }}
            </button>
          </div>
        </template>

        <div v-if="!ticker" class="text-sm text-red-600">
          Введите имя тикера
        </div>
        <div v-if="isTickerAdded" class="text-sm text-red-600">
          Такой тикер уже добавлен
        </div>
      </div>
    </div>

    <AddButton @click="add" :disabled="disabled" type="button" class="my-4" />
  </section>
</template>
<script>
import { getTickers } from "../local-storage-manager";
import AddButton from "./AddButton.vue";
export default {
  components: { AddButton },
  props: {
    disabled: {
      type: Boolean,
      required: false,
      default: false
    },
    tickers: {
      type: Array
    }
  },
  emits: {
    "add-ticker": value => typeof value === "string" && value.length > 0
  },
  data() {
    return {
      ticker: ""
    };
  },
  methods: {
    add() {
      if (this.ticker.length === 0) {
        return;
      }
      this.$emit("add-ticker", this.ticker);
      this.ticker = "";
    }
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
    isTickerAdded() {
      return (
        this.tickers?.filter(t =>
          t.name.startsWith(this.ticker.toLocaleUpperCase())
        ).length > 0 && this.ticker
      );
    }
  }
};
</script>
