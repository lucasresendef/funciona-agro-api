# field-management-backend

Backend em `Node.js + TypeScript` para gerenciamento de insumos por fazenda e talhão, com base preparada para controle de estoque, saídas para talhão, devoluções, custo por operação e permissões por fazenda.

## Stack

- Node.js
- TypeScript
- Fastify
- Prisma ORM
- PostgreSQL
- Docker Compose
- Keycloak
- ESLint
- Prettier
- Zod

## Estrutura

```text
src/
  modules/
    auth/
    users/
    farms/
    fields/
    units/
    products/
    inventory/
    field-operations/
    reports/
  shared/
    config/
    database/
    errors/
    http/
    middlewares/
    utils/
    types/
  app.ts
  server.ts
prisma/
  schema.prisma
docker/
  keycloak/
    import/
      field-management-backend-realm.json
  postgres/
    init.sql
```

## Portas

- API: `3099`
- PostgreSQL: `5544`
- Keycloak: `8181`

## Subindo com Docker Compose

1. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

2. Suba os serviços:

```bash
docker compose up -d --build
```

3. Acesse:

- API: `http://localhost:3099`
- Healthcheck: `http://localhost:3099/health`
- PostgreSQL: `localhost:5544`
- Keycloak: `http://localhost:8181`

Credenciais padrão do Keycloak em desenvolvimento:

- usuário: `admin`
- senha: `admin`

Ao subir o ambiente, o Keycloak importa automaticamente o realm `field-management-backend` e o client `field-management-api`.

## Banco de dados e migrations

Gerar o client do Prisma:

```bash
npm run prisma:generate
```

Criar e aplicar a migration inicial:

```bash
npm run prisma:migrate -- --name init
```

Abrir o Prisma Studio:

```bash
npm run prisma:studio
```

## Rodando localmente

Para rodar a API no seu terminal local e deixar só a infraestrutura no Docker:

1. Instale dependências:

```bash
npm install
```

2. Copie o ambiente:

```bash
cp .env.example .env
```

3. Suba apenas Postgres e Keycloak:

```bash
npm run infra:up
```

4. Se ainda não aplicou as migrations:

```bash
npm run prisma:migrate -- --name init
```

5. Rode o seed de desenvolvimento:

```bash
npm run prisma:seed
```

6. Execute a API em modo desenvolvimento:

```bash
npm run dev
```

A API ficará rodando no seu terminal em `http://localhost:3099`.

Se o container da API estiver rodando, pare antes para evitar conflito na porta `3099`:

```bash
docker compose stop field-management-backend-api
```

Logs da infraestrutura:

```bash
npm run infra:logs
```

Parar infraestrutura:

```bash
npm run infra:down
```

## Endpoints iniciais

- `GET /health`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`
- `POST /auth/sync-user`
- `GET /users`
- `POST /users`
- `DELETE /users/:id`
- `GET /units`
- `POST /units`
- `DELETE /units/:id`
- `GET /farms`
- `POST /farms`
- `DELETE /farms/:id`
- `GET /farm-permissions`
- `POST /farm-permissions`
- `DELETE /farm-permissions/:id`
- `GET /fields`
- `POST /fields`
- `DELETE /fields/:id`
- `GET /products`
- `POST /products`
- `DELETE /products/:id`
- `GET /inventory/locations`
- `POST /inventory/locations`
- `DELETE /inventory/locations/:id`
- `GET /inventory/balance`
- `POST /inventory/balance`
- `DELETE /inventory/balance/:id`
- `GET /field-operations`
- `POST /field-operations`
- `PATCH /field-operations/:id`
- `DELETE /field-operations/:id`
- `POST /reports/inventory-movements/csv`
- `GET /reports/jobs/:jobId`
- `GET /reports/jobs/:jobId/download`

## Autenticação

A base de autenticação com Keycloak já está preparada para:

- login via Keycloak por `grant_type=password`
- renovação de sessão via Keycloak por `grant_type=refresh_token`
- leitura e validação do `accessToken` bearer
- verificação de assinatura via `KEYCLOAK_PUBLIC_KEY`
- verificação de `issuer`, `azp`, `exp` e `nbf`
- extração de `sub`, `name` e `email`
- injeção do usuário autenticado em `request.authUser`
- auditoria derivada do usuário autenticado no token (`sub` e `email`)
- sincronização do `app_user` local via endpoint `/auth/sync-user`
- base de serviço para restrição futura de acesso por fazenda

As rotas de negócio estão protegidas por autenticação. Neste momento, apenas estas rotas permanecem públicas:

- `GET /health`
- `POST /auth/login`
- `POST /auth/refresh`

## Keycloak

O projeto já inclui um import automático inicial em [field-management-backend-realm.json](/Users/lucasresende/Documents/Codes/fields-code/field-management-backend/docker/keycloak/import/field-management-backend-realm.json), com:

- realm `field-management-backend`
- client público `field-management-api` para app Flutter/mobile usando `Direct Access Grants`
- claim obrigatória `tenant_id` no access token
- claims `sub`, `preferred_username`, `name` e `email` disponíveis no token
- roles de base: `app-admin`, `farm-owner`, `farm-manager`, `farm-operator`, `farm-viewer`

O backend pode autenticar no Keycloak e retornar `accessToken`, `idToken` e `refreshToken`, mantendo o uso de `accessToken` bearer para as rotas protegidas.

## Contrato de auditoria para o app

As rotas de escrita não aceitam mais auditoria enviada no body.
A auditoria (`createdBy`, `createdByEmail`, `updatedBy`, `updatedByEmail`) é preenchida internamente pelo backend a partir do token autenticado.

Exemplo de criação:

```bash
curl -X POST http://localhost:3099/farms \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "createdBy": "Fulano da Silva",
    "createdByEmail": "fulano@empresa.com",
    "name": "Fazenda A",
    "code": "FZ-A"
  }'
```

Exemplo de remoção lógica:

```bash
curl -X DELETE http://localhost:3099/farms/UUID_DA_FAZENDA \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "updatedBy": "Fulano da Silva",
    "updatedByEmail": "fulano@empresa.com"
  }'
```

## Contrato `field-operations`

- `responsibleUserId` não deve mais ser enviado.
- O responsável operacional deve ser informado via auditoria no body da requisição.
- `items[].notes` aceita `string`, `null` ou ausência do campo.
- `inventoryLocationId` é obrigatório na criação.
- Ao criar (`POST /field-operations`), o backend baixa o estoque dos itens (`OUTBOUND_TO_FIELD`).
- Ao editar devolutiva (`PATCH /field-operations/:id`) e aumentar `quantityReturned`, o backend devolve estoque (`RETURN_FROM_FIELD`).
- O endpoint de edição usa `PATCH` (atualização parcial), não `PUT`.

Exemplo de criação (baixa estoque):

```bash
curl -X POST http://localhost:3099/field-operations \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "farmId": "347481be-f9c9-431c-960a-11cb91b9f21e",
    "fieldId": "081c4c42-37f7-4e62-9844-46eeff699180",
    "inventoryLocationId": "LOC_UUID",
    "operationDate": "2026-04-16T16:43:23.379Z",
    "status": "OPEN",
    "description": "Aplicação inicial",
    "items": [
      {
        "productId": "1e24a93d-fe22-43ac-8c1d-013f6802a888",
        "quantitySent": 2,
        "quantityReturned": 0,
        "quantityConsumed": 2,
        "unitCostAtOperation": 25,
        "notes": "teste"
      }
    ],
    "createdBy": "7481b60c-40b4-4ae7-a3ba-74aed8bfff0b",
    "createdByEmail": "lucas@lucas"
  }'
```

## Contrato `products`

- Na criação, o produto já deve informar em quais locais será estocado.
- A listagem retorna o saldo do produto por local de estoque.

Exemplo de criação:

```bash
curl -X POST http://localhost:3099/products \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ureia Perolada",
    "code": "PROD-UREIA-002",
    "category": "FERTILIZER",
    "unitOfMeasureId": "UUID_UNIDADE",
    "stockByLocation": [
      {
        "farmId": "UUID_FAZENDA",
        "inventoryLocationId": "UUID_LOCAL",
        "quantity": 1200,
        "averageUnitCost": 2.55,
        "notes": "Carga inicial"
      }
    ],
    "createdBy": "7481b60c-40b4-4ae7-a3ba-74aed8bfff0b",
    "createdByEmail": "lucas@lucas"
  }'
```

Resposta de `GET /products` inclui:

- `stockByLocation`: lista com `farmId`, `farmName`, `inventoryLocationId`, `inventoryLocationName`, `quantity` e `averageUnitCost`
- `totalStockQuantity`: soma total do produto em todos os locais ativos

Exemplo de edição parcial (devolutiva):

```bash
curl -X PATCH http://localhost:3099/field-operations/9905b666-577c-40af-bd14-99630090bfaa \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "FINISHED",
    "finishedAt": "2026-04-16T17:03:55.957Z",
    "items": [
      {
        "id": "8037b2c8-f06a-408a-8379-0ff749ea2432",
        "quantityReturned": 1,
        "quantityConsumed": 1,
        "notes": "devolução parcial"
      }
    ],
    "updatedBy": "7481b60c-40b4-4ae7-a3ba-74aed8bfff0b",
    "updatedByEmail": "lucas@lucas"
  }'
```

### Cadastro de usuários

1. Acesse `http://localhost:8181`
2. Entre com `admin / admin`
3. Selecione o realm `field-management-backend`
4. Vá em `Users`
5. Crie o usuário
6. Em `Credentials`, defina uma senha e marque como permanente

### Fluxo de autenticação

1. Login:

```bash
curl -X POST http://localhost:3099/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "SEU_USUARIO",
    "password": "SUA_SENHA"
  }'
```

2. Use o `accessToken` retornado para chamar a API:

```bash
curl http://localhost:3099/farms \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

3. Quando necessário, renove a sessão com `refreshToken`:

```bash
curl -X POST http://localhost:3099/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "SEU_REFRESH_TOKEN"
  }'
```

O backend valida apenas o `accessToken` nas rotas protegidas. `idToken` é retornado no login/refresh para consumo do cliente, quando aplicável.

### Fluxo prático de usuário local

O usuário autenticado é sincronizado automaticamente no banco local no primeiro request protegido. Se você quiser forçar um resync manual do perfil atual:

```bash
curl -X POST http://localhost:3099/auth/sync-user \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Depois consulte o usuário atual:

```bash
curl http://localhost:3099/auth/me \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

### Observação para ambiente local

Se você já subiu uma versão anterior do realm importado, recrie a infraestrutura para aplicar os novos clients do Keycloak:

```bash
docker compose down -v --remove-orphans
npm run infra:up
```

Com isso, o `app_user` local passa a existir automaticamente a partir do token. A partir dessa etapa, `POST /farm-permissions` pode usar `userId` interno, sem precisar informar `keycloakUserId`, `userName` e `userEmail` manualmente.

## Seed de Desenvolvimento

O script de seed preenche a base com dados consistentes para desenvolvimento:

- `app_user`
- `farm`
- `field`
- `unit_of_measure`
- `product`
- `inventory_location`
- `inventory_balance`
- `inventory_movement`
- `field_operation`
- `field_operation_item`
- `farm_user_permission`

Execute assim:

```bash
npm run prisma:seed
```

O seed e idempotente para os registros principais: você pode rodar novamente sem duplicar users, fazendas, talhoes, unidades, produtos, locais e permissoes.

Por padrao, ele cria um usuario de desenvolvimento:

- `Lucas Resende` (`lucas@lucas`)

## Estoque

O endpoint `POST /inventory/balance` funciona como abertura ou ajuste manual de saldo.

- se ainda não existir saldo para o produto no local informado, ele cria o saldo inicial e registra uma movimentação `ENTRY`
- se já existir saldo, ele ajusta o valor atual e registra `ADJUSTMENT_IN` ou `ADJUSTMENT_OUT` conforme a diferença

## Scripts

- `npm run dev`
- `npm run infra:up`
- `npm run infra:down`
- `npm run infra:logs`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run format`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:seed`
- `npm run prisma:studio`
