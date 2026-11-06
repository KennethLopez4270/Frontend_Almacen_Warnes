<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

export interface SelectOption {
  value: number | string | null
  label: string
  subtitle?: string
  badge?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: number | string | null | undefined
    options: SelectOption[]
    placeholder?: string
    searchable?: boolean
    actionLabel?: string
    showAction?: boolean
    disabled?: boolean
    required?: boolean
  }>(),
  {
    placeholder: 'Seleccione una opción...',
    searchable: true,
    showAction: false,
    disabled: false,
    required: false,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'action'): void
}>()

const isOpen = ref(false)
const searchQuery = ref('')
const containerRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const selectedOption = computed(() => {
  return props.options.find((opt) => opt.value === props.modelValue)
})

const filteredOptions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return props.options
  return props.options.filter((opt) => {
    const labelMatch = opt.label?.toLowerCase().includes(query)
    const subtitleMatch = opt.subtitle?.toLowerCase().includes(query)
    return labelMatch || subtitleMatch
  })
})

function toggleDropdown() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    searchQuery.value = ''
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
}

function closeDropdown() {
  isOpen.value = false
  searchQuery.value = ''
}

function selectOption(option: SelectOption) {
  emit('update:modelValue', option.value)
  closeDropdown()
}

function triggerAction() {
  emit('action')
  closeDropdown()
}

function handleClickOutside(event: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div ref="containerRef" class="custom-select-container" :class="{ 'is-open': isOpen, 'is-disabled': disabled }">
    <!-- TRIGGER BUTTON -->
    <div
      class="custom-select-trigger"
      tabindex="0"
      role="button"
      :aria-expanded="isOpen"
      @click="toggleDropdown"
      @keydown.enter.prevent="toggleDropdown"
      @keydown.space.prevent="toggleDropdown"
    >
      <div class="custom-select-trigger-content">
        <!-- LABEL SELECCIONADO O PLACEHOLDER -->
        <span v-if="selectedOption" class="select-current-label">
          {{ selectedOption.label }}
        </span>
        <span v-else class="select-placeholder">
          {{ placeholder }}
        </span>
      </div>

      <!-- CHEVRON -->
      <span class="select-chevron" :class="{ 'is-rotated': isOpen }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </div>

    <!-- DROPDOWN FLOTANTE -->
    <transition name="select-pop">
      <div v-if="isOpen" class="custom-select-popover">
        <!-- BUSCADOR INTERNO RÁPIDO -->
        <div v-if="searchable && options.length > 4" class="select-search-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="select-search-icon">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            class="select-search-input"
            placeholder="Buscar..."
            @click.stop
          />
          <button v-if="searchQuery" type="button" class="select-search-clear" @click.stop="searchQuery = ''">
            &times;
          </button>
        </div>

        <!-- LISTA DE OPCIONES -->
        <ul class="select-options-list">
          <li
            v-for="opt in filteredOptions"
            :key="String(opt.value)"
            class="select-option-item"
            :class="{ 'is-selected': opt.value === modelValue }"
            @click.stop="selectOption(opt)"
          >
            <div class="option-left">
              <div class="option-text-group">
                <span class="option-label">{{ opt.label }}</span>
                <span v-if="opt.subtitle" class="option-subtitle">{{ opt.subtitle }}</span>
              </div>
            </div>

            <!-- CHECKMARK SI ESTÁ SELECCIONADO -->
            <div v-if="opt.value === modelValue" class="option-check">
              <svg viewBox="0 0 20 20" fill="currentColor" class="check-svg">
                <path
                  fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
          </li>

          <!-- ESTADO VACÍO -->
          <li v-if="filteredOptions.length === 0" class="select-empty-state">
            No se encontraron resultados para "{{ searchQuery }}"
          </li>
        </ul>

        <!-- BOTÓN FOOTER ACCIÓN (ATAJO RÁPIDO PARA CREAR) -->
        <div v-if="showAction && actionLabel" class="select-action-footer">
          <button type="button" class="select-btn-action" @click.stop="triggerAction">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="action-icon-plus">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{{ actionLabel }}</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.custom-select-container {
  position: relative;
  width: 100%;
  user-select: none;
  font-family: inherit;
}

.custom-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 40px;
  padding: 0 12px;
  background-color: #ffffff;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  box-sizing: border-box;
}

.custom-select-trigger:hover {
  border-color: #94a3b8;
  background-color: #f8fafc;
}

.custom-select-container.is-open .custom-select-trigger,
.custom-select-trigger:focus-visible {
  outline: none;
  border-color: #2563eb;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.custom-select-container.is-disabled .custom-select-trigger {
  background-color: #f1f5f9;
  border-color: #e2e8f0;
  cursor: not-allowed;
  opacity: 0.7;
}

.custom-select-trigger-content {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.select-current-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-placeholder {
  font-size: 0.875rem;
  color: #94a3b8;
}

.select-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: #64748b;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-left: 6px;
  flex-shrink: 0;
}

.select-chevron svg {
  width: 14px;
  height: 14px;
}

.select-chevron.is-rotated {
  transform: rotate(180deg);
  color: #2563eb;
}

/* POPOVER DROPDOWN */
.custom-select-popover {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  min-width: 250px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08);
  z-index: 1050;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.select-search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  padding: 8px 10px;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.select-search-icon {
  width: 15px;
  height: 15px;
  color: #94a3b8;
  position: absolute;
  left: 18px;
  pointer-events: none;
}

.select-search-input {
  width: 100%;
  height: 32px;
  padding: 0 28px 0 32px;
  font-size: 0.8125rem;
  color: #1e293b;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.15s ease;
}

.select-search-input:focus {
  border-color: #2563eb;
}

.select-search-clear {
  position: absolute;
  right: 18px;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.select-search-clear:hover {
  color: #475569;
}

/* LISTA */
.select-options-list {
  list-style: none;
  margin: 0;
  padding: 4px;
  max-height: 220px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.select-options-list::-webkit-scrollbar {
  width: 6px;
}
.select-options-list::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 4px;
}

.select-option-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  margin: 2px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.select-option-item:hover {
  background-color: #f1f5f9;
}

.select-option-item.is-selected {
  background-color: #eff6ff;
  color: #1d4ed8;
}

.option-left {
  display: flex;
  align-items: center;
  overflow: hidden;
  flex: 1;
}

.option-text-group {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.option-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-option-item.is-selected .option-label {
  color: #1d4ed8;
  font-weight: 600;
}

.option-subtitle {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-option-item.is-selected .option-subtitle {
  color: #3b82f6;
}

.option-check {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
  margin-left: 8px;
  flex-shrink: 0;
}

.check-svg {
  width: 16px;
  height: 16px;
}

.select-empty-state {
  padding: 16px 12px;
  text-align: center;
  font-size: 0.8125rem;
  color: #94a3b8;
}

/* FOOTER ACCIÓN */
.select-action-footer {
  padding: 8px 10px;
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.select-btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 7px 12px;
  background: #ffffff;
  border: 1.5px dashed #38bdf8;
  border-radius: 6px;
  color: #0284c7;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.select-btn-action:hover {
  background: #e0f2fe;
  border-color: #0284c7;
  color: #0369a1;
}

.action-icon-plus {
  width: 14px;
  height: 14px;
}

/* ANIMACIONES */
.select-pop-enter-active {
  transition: all 0.15s ease-out;
}
.select-pop-leave-active {
  transition: all 0.1s ease-in;
}
.select-pop-enter-from,
.select-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
