# Cores do Fundo Vermelho - Tela de Login

## Configuração CSS Atual

### Gradientes Radiais:
- **Posição 30% 20%**: `rgba(139, 0, 0, 0.15)` - Vermelho escuro com 15% de opacidade
- **Posição 70% 80%**: `rgba(178, 34, 34)` - Vermelho tijolo com 12% de opacidade  
- **Posição 10% 60%**: `rgba(220, 20, 60, 0.08)` - Carmesim com 8% de opacidade

### Gradiente Linear (135deg):
- **0%**: `#1a0000` - Vermelho muito escuro
- **50%**: `#2d0a0a` - Vermelho escuro médio
- **100%**: `#0f0f0f` - Cinza escuro

### Código CSS Completo:
```css
background: 
    radial-gradient(circle at 30% 20%, rgba(139, 0, 0, 0.15) 0%, transparent 60%),
    radial-gradient(circle at 70% 80%, rgba(178, 34, 34, 0.12) 0%, transparent 50%),
    radial-gradient(circle at 10% 60%, rgba(220, 20, 60, 0.08) 0%, transparent 40%),
    linear-gradient(135deg, #1a0000 0%, #2d0a0a 50%, #0f0f0f 100%);
```

## Cores em Valores RGB:
- **rgba(139, 0, 0)**: Vermelho escuro
- **rgba(178, 34, 34)**: Vermelho tijolo (FireBrick)
- **rgba(220, 20, 60)**: Carmesim (Crimson)
- **#1a0000**: Vermelho muito escuro (26, 0, 0)
- **#2d0a0a**: Vermelho escuro médio (45, 10, 10)
- **#0f0f0f**: Cinza escuro (15, 15, 15)

---
*Arquivo criado em: Janeiro 2025*
*Projeto: Sistema de Login Frontend/Backend*