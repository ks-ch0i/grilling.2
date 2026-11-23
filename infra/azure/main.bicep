targetScope = 'resourceGroup'

@description('Name of the new Grill-Me Static Web App.')
param staticWebAppName string = 'swa-grill-me-prod'

@description('Name of the existing Cosmos DB account. This account is referenced only and is never redeployed.')
param cosmosAccountName string

@description('Name of the dedicated Grill-Me Cosmos DB for NoSQL database.')
param databaseName string = 'pixel-raid'

@description('Database-level shared manual throughput in RU/s.')
@minValue(400)
@maxValue(400)
param databaseThroughput int = 400

var staticWebAppLocation = 'eastasia'

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: staticWebAppLocation
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  tags: {
    project: 'grill-me'
    environment: 'production'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    allowConfigFileUpdates: true
  }
}

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' existing = {
  name: cosmosAccountName
}

resource gameDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-11-15' = {
  parent: cosmosAccount
  name: databaseName
  properties: {
    options: {
      throughput: databaseThroughput
    }
    resource: {
      id: databaseName
    }
  }
}

resource playerSaves 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = {
  parent: gameDatabase
  name: 'player-saves'
  properties: {
    options: {}
    resource: {
      id: 'player-saves'
      partitionKey: {
        kind: 'Hash'
        paths: [
          '/userId'
        ]
        version: 2
      }
    }
  }
}

resource leaderboards 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = {
  parent: gameDatabase
  name: 'leaderboards'
  properties: {
    options: {}
    resource: {
      id: 'leaderboards'
      partitionKey: {
        kind: 'Hash'
        paths: [
          '/boardId'
        ]
        version: 2
      }
    }
  }
}

@description('Generated default hostname of the new Static Web App. No deployment token is output.')
output staticWebAppHostname string = staticWebApp.properties.defaultHostname
