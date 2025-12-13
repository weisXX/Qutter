<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="app-container">
    <RouterView />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: #2d3748;
  background: #f7fafc;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

#app {
  max-width: none;
  margin: 0;
  padding: 0;
  font-weight: normal;
}

a,
.green {
  text-decoration: none;
  color: #4299e1;
  transition: 0.2s;
}

@media (hover: hover) {
  a:hover {
    color: #3182ce;
  }
}

@media (min-width: 1024px) {
  body {
    display: block;
    place-items: unset;
  }

  #app {
    display: block;
    grid-template-columns: none;
    padding: 0;
  }
}
</style>
