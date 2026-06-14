<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let variant: 'primary' | 'secondary' | 'danger' | 'ghost' | 'scan' | 'picker' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let glow = false;
  export let disabled = false;
  export let loading = false;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let fullWidth = false;
  export let active = false;
  export let title = '';

  const classes = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
    scan: 'btn-scan',
    picker: 'btn-picker'
  };

  const sizes = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg'
  };
</script>

<button
  {type}
  {title}
  class="base-btn {classes[variant]} {sizes[size]}"
  class:glow
  class:disabled={disabled || loading}
  class:full-width={fullWidth}
  class:active
  disabled={disabled || loading}
  on:click={(e) => !disabled && !loading && dispatch('click', e)}
>
  {#if loading}
    <div class="loader"></div>
  {/if}
  <div class="content" style="opacity: {loading ? 0 : 1}">
    <slot name="icon" />
    <slot />
  </div>
</button>

<style>
  .base-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 0.75rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    position: relative;
    outline: none;
    gap: 0.5rem;
    white-space: nowrap;
    user-select: none;
  }

  .btn-sm { padding: 0.4rem 0.75rem; font-size: 0.65rem; border-radius: 0.5rem; }
  .btn-md { padding: 0.6rem 1.25rem; font-size: 0.75rem; }
  .btn-lg { padding: 0.8rem 1.75rem; font-size: 0.9rem; border-radius: 1rem; }

  .full-width { width: 100%; }

  .btn-primary { 
    background: var(--accent); 
    color: white; 
  }
  .btn-primary:hover:not(:disabled) { 
    transform: translateY(-2px); 
    box-shadow: 0 4px 12px var(--accent-glow); 
  }

  .btn-secondary { 
    background: var(--bg-card); 
    color: var(--text-secondary); 
    border: 1px solid var(--border-ui); 
  }
  .btn-secondary:hover:not(:disabled) { 
    border-color: var(--accent); 
    color: var(--accent); 
  }

  .btn-danger { 
    background: var(--status-error); 
    color: white; 
  }
  .btn-danger:hover:not(:disabled) { 
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); 
    transform: translateY(-2px);
  }

  .btn-ghost { 
    background: transparent; 
    color: var(--text-muted); 
  }
  .btn-ghost:hover:not(:disabled) { 
    background: var(--border-ui); 
    color: var(--text-primary); 
  }

  .btn-scan { 
    background: var(--bg-card); 
    border: 1px solid var(--border-ui); 
    color: var(--text-secondary); 
  }
  .btn-scan:hover:not(:disabled) { 
    color: var(--accent); 
    border-color: var(--accent); 
  }

  .btn-picker { 
    background: var(--bg-card); 
    border: 1px solid var(--border-ui); 
    color: var(--text-secondary); 
  }
  .btn-picker:hover:not(:disabled) { 
    border-color: var(--accent); 
    color: var(--accent); 
  }
  .btn-picker.active { 
    background: var(--accent-glow); 
    color: var(--accent); 
    border-color: var(--accent); 
    box-shadow: 0 0 15px var(--accent-glow); 
  }

  .glow { box-shadow: 0 0 15px var(--accent-glow); }
  .glow:hover { box-shadow: 0 0 25px var(--accent-glow); }

  .disabled { 
    opacity: 0.5; 
    cursor: not-allowed; 
    pointer-events: none;
  }

  .content {
    display: flex;
    align-items: center;
    gap: inherit;
  }

  .loader {
    position: absolute;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
