# 📱 Sistema de Sincronização Entre Dispositivos

## 🎯 Visão Geral

O sistema de sincronização entre dispositivos permite que usuários mantenham seus dados sincronizados em múltiplos dispositivos (celular, tablet, computador, etc.) em tempo real.

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas

1. **user_devices** - Gerencia os dispositivos de cada usuário
   - `id`: ID único do dispositivo
   - `user_id`: ID do usuário proprietário
   - `device_name`: Nome do dispositivo (ex: "iPhone de João")
   - `device_type`: Tipo (mobile, desktop, tablet)
   - `device_fingerprint`: Identificador único do dispositivo
   - `is_active`: Status ativo/inativo
   - `last_seen`: Última vez que o dispositivo foi visto online
   - `created_at`: Data de criação

2. **device_sessions** - Sessões independentes por dispositivo
   - `id`: ID único da sessão
   - `device_id`: ID do dispositivo
   - `session_token`: Token único da sessão
   - `expires_at`: Data de expiração
   - `is_active`: Status da sessão
   - `created_at`: Data de criação

3. **sync_data** - Dados para sincronização
   - `id`: ID único do registro
   - `user_id`: ID do usuário
   - `data_type`: Tipo de dado (profile, settings, etc.)
   - `data_key`: Chave específica do dado
   - `data_value`: Valor do dado (JSON)
   - `device_id`: Dispositivo que originou a mudança
   - `version`: Versão para controle de conflitos
   - `created_at`: Data de criação
   - `updated_at`: Data de atualização

4. **sync_notifications** - Notificações entre dispositivos
   - `id`: ID único da notificação
   - `user_id`: ID do usuário
   - `device_id`: Dispositivo de destino (null = todos)
   - `notification_type`: Tipo da notificação
   - `title`: Título da notificação
   - `message`: Mensagem
   - `data`: Dados adicionais (JSON)
   - `is_read`: Status de leitura
   - `created_at`: Data de criação

## 🔌 API Endpoints

### Gerenciamento de Dispositivos

#### `POST /api/sync/register-device`
Registra ou atualiza um dispositivo

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "device_name": "iPhone de João",
  "device_type": "mobile",
  "device_fingerprint": "unique-device-id-123"
}
```

**Response:**
```json
{
  "success": true,
  "device": {
    "id": 1,
    "device_name": "iPhone de João",
    "device_type": "mobile",
    "is_active": true
  }
}
```

#### `GET /api/sync/devices`
Lista todos os dispositivos do usuário

**Response:**
```json
{
  "success": true,
  "devices": [
    {
      "id": 1,
      "device_name": "iPhone de João",
      "device_type": "mobile",
      "is_active": true,
      "last_seen": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Sincronização de Dados

#### `POST /api/sync/data`
Sincroniza dados do dispositivo atual

**Body:**
```json
{
  "data_type": "profile",
  "data_key": "avatar_url",
  "data_value": "/uploads/profile-pictures/user_1_avatar.jpg"
}
```

#### `GET /api/sync/data`
Obtém dados sincronizados

**Query Parameters:**
- `data_type` (opcional): Filtrar por tipo de dado
- `since` (opcional): Data ISO para obter apenas dados modificados após esta data

### Notificações

#### `GET /api/sync/notifications`
Obtém notificações do dispositivo

#### `POST /api/sync/notifications/:id/read`
Marca uma notificação como lida

### Controle de Dispositivos

#### `POST /api/sync/disconnect-device/:deviceId`
Desconecta um dispositivo específico

#### `POST /api/sync/disconnect-all`
Desconecta todos os dispositivos (exceto o atual)

## 🚀 Como Usar

### 1. Registrar um Dispositivo

Quando um usuário faz login em um novo dispositivo:

```javascript
// Gerar fingerprint único do dispositivo
const deviceFingerprint = generateDeviceFingerprint();

// Registrar o dispositivo
const response = await fetch('/api/sync/register-device', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    device_name: 'iPhone de João',
    device_type: 'mobile',
    device_fingerprint: deviceFingerprint
  })
});
```

### 2. Sincronizar Dados

Quando o usuário atualiza seu perfil:

```javascript
// Sincronizar nova foto de perfil
await fetch('/api/sync/data', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    data_type: 'profile',
    data_key: 'avatar_url',
    data_value: newAvatarUrl
  })
});
```

### 3. Verificar Atualizações

Periodicamente, verificar se há dados novos:

```javascript
// Verificar dados atualizados desde a última sincronização
const lastSync = localStorage.getItem('lastSyncTime');
const response = await fetch(`/api/sync/data?since=${lastSync}`, {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

const { data } = await response.json();
if (data.length > 0) {
  // Aplicar atualizações localmente
  updateLocalData(data);
  localStorage.setItem('lastSyncTime', new Date().toISOString());
}
```

### 4. Gerenciar Dispositivos

Na página de configurações, mostrar dispositivos conectados:

```javascript
// Listar dispositivos
const response = await fetch('/api/sync/devices', {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

const { devices } = await response.json();

// Desconectar um dispositivo
await fetch(`/api/sync/disconnect-device/${deviceId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});
```

## 🔒 Segurança

- Todos os endpoints requerem autenticação via JWT
- Cada dispositivo tem um fingerprint único
- Sessões têm expiração automática
- Dados são isolados por usuário
- Controle granular de acesso por dispositivo

## 📊 Monitoramento

- Rastreamento de última atividade por dispositivo
- Logs de sincronização
- Controle de versão para resolução de conflitos
- Notificações de segurança para novos dispositivos

## 🎯 Próximos Passos

1. **Interface de Usuário**: Criar páginas para gerenciar dispositivos
2. **Sincronização em Tempo Real**: Implementar WebSockets
3. **Resolução de Conflitos**: Lógica avançada para conflitos de dados
4. **Backup e Restauração**: Sistema de backup automático
5. **Notificações Push**: Integração com serviços de push notification

---

✅ **Sistema configurado e pronto para uso!**

Para testar as funcionalidades, use os endpoints da API com um cliente REST como Postman ou implemente a interface de usuário conforme necessário.