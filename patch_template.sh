#!/bin/bash
sed -i '/<div class="builder-header">/i \
            <div class="mana-curve-container">\n\
              <button class="toggle-curve-btn" @click="showManaCurve = !showManaCurve">\n\
                <span v-if="showManaCurve">Masquer Courbe de Mana</span>\n\
                <span v-else>Afficher Courbe de Mana</span>\n\
              </button>\n\
              <div v-if="showManaCurve" class="mana-histogram">\n\
                <div v-for="(count, level) in manaCurve" :key="level" class="mana-bar-container">\n\
                  <div class="mana-bar" :style="{ height: (count / maxManaCount) * 100 + '\''%'\'' }"></div>\n\
                  <div class="mana-label">{{ level }}</div>\n\
                  <div class="mana-count" v-if="count > 0">{{ count }}</div>\n\
                </div>\n\
              </div>\n\
            </div>\n\
' front/src/components/RightDrawer.vue
