#!/bin/bash
sed -i '/<div class="builder-actions">/i \
            <div v-if="authError" class="auth-error">\n\
              {{ authError }}\n\
            </div>\n\
' front/src/components/RightDrawer.vue
