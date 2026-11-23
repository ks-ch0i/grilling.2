# Grill-Me 사내 배포 및 운영 안내

## 현재 배포 상태

| 항목 | 값 |
| --- | --- |
| Azure 구독 | `REPLACE_WITH_AZURE_SUBSCRIPTION_ID` |
| 리소스 그룹 | `REPLACE_WITH_AZURE_RESOURCE_GROUP` |
| Static Web App | `swa-grill-me-prod` / Standard / East Asia |
| 사이트 주소 | `https://happy-ocean-085e57100.6.azurestaticapps.net` |
| Cosmos DB 계정 | 기존 공유 계정 / Korea Central (실제 계정 이름과 endpoint는 Git에 기록하지 않음) |
| NoSQL 데이터베이스 | 새 `pixel-raid` / 공유 수동 처리량 400 RU/s |
| 저장 컨테이너 | `player-saves`, 파티션 키 `/userId` |
| 기록 컨테이너 | `leaderboards`, 파티션 키 `/boardId` |

Standard SWA, 데이터베이스와 컨테이너 2개가 준비되어 있습니다. 현재 Azure에는 기존 방식의 Entra 앱 등록 두 개와 API 환경 설정이 있습니다. 아래 단일 앱 구성은 로컬 배포 코드에 반영했으며, SWA 운영 환경은 첫 배포를 기다리고 있습니다.

Bicep은 새 Static Web App과 `pixel-raid` 데이터베이스 및 컨테이너 2개만 관리합니다. 공유 Cosmos 계정과 리소스 그룹의 다른 프로젝트 자원은 배포 범위가 아닙니다.

## 사이트 주소 변경

`azurestaticapps.net` 기본 호스트 이름 자체를 원하는 이름으로 바꿀 수는 없지만, 소유한 회사 도메인을 연결해 기본 주소로 지정할 수 있습니다. Static Web Apps는 연결한 도메인에도 TLS 인증서를 자동으로 발급하며, custom domain을 기본으로 지정하면 기본 호스트를 포함한 나머지 주소를 그 도메인으로 리디렉션할 수 있습니다. 도메인 등록과 DNS 관리 비용/권한은 회사 도메인 제공자 정책을 따릅니다. [Custom domains](https://learn.microsoft.com/azure/static-web-apps/custom-domain), [기본 도메인 설정](https://learn.microsoft.com/azure/static-web-apps/custom-domain-default)

도메인을 정하면 Azure Portal의 `swa-grill-me-prod` → **Custom domains**에서 소유권 검증과 DNS 연결을 마친 뒤, 웹 리디렉션 URI `https://<custom-domain>/.auth/login/aad/callback`을 로그인용 Entra 앱에 추가합니다. 현재는 도메인을 지정하지 않았습니다.

## 비용 및 보안 범위

- Static Web Apps Standard는 앱별로 과금됩니다. 기존 Standard 앱의 요금제를 Grill-Me와 공유할 수 없어 새 Standard 앱을 만들었습니다.
- Cosmos DB 데이터베이스에 공유 수동 처리량 400 RU/s를 추가했습니다. 현재 계정의 기존 최소 프로비저닝 처리량과 저장량 등에 따라 실제 청구액이 달라집니다.
- 이 SWA 관리형 API 구성은 Cosmos 접근에 서버 측 `COSMOS_KEY`를 사용합니다. 이 계정 키는 계정 전체에 적용되며 다른 프로젝트에도 영향을 줄 수 있습니다.
- Cosmos 키를 브라우저 변수, 매개변수 파일, 저장소, GitHub 변수, 명령 기록 또는 로그에 넣지 마세요. Azure Static Web App의 서버 환경 변수에만 직접 입력합니다. 공유 계정 키 회전은 다른 사용자와 조율 없이 하지 않습니다.
- 이 앱은 인터넷에서 사이트에 접근할 수 있습니다. Static Web Apps의 Entra 인증과 `grill-member` 역할이 게임 파일과 API 접근을 제한합니다.
- Standard의 프라이빗 엔드포인트 기능은 이 인터넷 공개 게임에 구성하지 않았으며 기존 Cosmos 계정의 네트워크 설정도 변경하지 않았습니다.

## 운영 구성 순서

### 1. 회사 Entra 앱 등록 하나 구성

기존 `Grill-Me SPA` 등록을 SWA 로그인에 재사용합니다. Entra의 **Microsoft Entra ID → 앱 등록 → Grill-Me SPA**로 이동합니다.

1. 지원 계정 유형 **이 조직 디렉터리의 계정만**을 확인합니다.
2. **인증 → 플랫폼 추가 → 웹**에서 콜백 `https://happy-ocean-085e57100.6.azurestaticapps.net/.auth/login/aad/callback`을 등록합니다.
3. **토큰 구성 → 선택적 클레임 추가 → ID → acct**를 확인합니다. SWA 역할 함수는 `acct=0`인 계정에만 `grill-member`를 부여합니다. 실제 클레임 전달은 운영 로그인에서 확인합니다.
4. **인증서 및 비밀 → 새 클라이언트 비밀**에서 생성한 값을 바로 SWA 환경 변수 `ENTRA_SWA_CLIENT_SECRET`에 보관합니다. 만료일을 기록합니다.
5. 로그인과 게스트 차단을 확인한 뒤 기존 SPA 플랫폼, `game.access` 위임 권한과 별도 `Grill-Me API` 등록을 정리합니다. 테넌트 정책상 로그인 동의가 필요하면 Entra 관리자가 처리합니다.

SWA는 사이트와 `/api/*`에 구성원 역할을 요구합니다. 저장 키는 SWA가 부여한 이 앱의 사용자 ID를 사용합니다. SWA에서 사용자 정보를 제거한 뒤 다시 등록하면 ID가 바뀔 수 있으므로 기록 삭제와 접근 권한 정리를 구분합니다. [SWA 커스텀 인증](https://learn.microsoft.com/azure/static-web-apps/authentication-custom), [SWA 사용자 정보](https://learn.microsoft.com/azure/static-web-apps/user-information)

### 2. Static Web App 서버 설정

Azure Portal에서 `swa-grill-me-prod`의 **Settings → Environment variables**에서 Production 설정을 확인합니다.

| 이름 | 값 |
| --- | --- |
| `ENTRA_SWA_CLIENT_ID` | 로그인에 재사용할 `Grill-Me SPA`의 Application (client) ID |
| `ENTRA_SWA_CLIENT_SECRET` | Entra 앱에서 만든 클라이언트 비밀 |
| `COSMOS_ENDPOINT` | 기존 공유 Cosmos의 endpoint |
| `COSMOS_KEY` | 기존 공유 Cosmos 계정 키 |

DB 및 컨테이너 이름의 기본값은 `pixel-raid`, `player-saves`, `leaderboards`입니다. 이미 등록된 동일한 값도 사용할 수 있습니다. 실제 Cosmos endpoint, 키 및 Entra 클라이언트 비밀은 Azure 서버 설정에만 보관합니다. 전환 검증 뒤 이전 토큰 검증용 `ENTRA_TENANT_ID`, `ENTRA_SPA_CLIENT_ID`, `ENTRA_API_AUDIENCE`, `ENTRA_REQUIRED_SCOPE`를 정리합니다.

### 3. GitHub 배포 설정

저장소의 **Settings → Secrets and variables → Actions**에서 배포 토큰과 배포 사용 여부를 설정합니다.

다음 Repository secret을 추가합니다.

| Secret | 값 |
| --- | --- |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | `swa-grill-me-prod` 배포 토큰 |

토큰은 Azure Portal의 해당 SWA 배포 토큰 화면에서 확인해 GitHub secret에 바로 입력합니다. 채팅, 커밋, 변수, 빌드 산출물 또는 로그에 복사하지 않습니다. Cosmos 키는 GitHub에 등록하지 않습니다.

워크플로 파일 `.github/workflows/azure-static-web-apps.yml`은 `main` push와 수동 실행에서 Node 22.12.0으로 프론트엔드/API를 검증하고 빌드합니다. 빌드 결과에서 Node 22, SWA 역할 함수, 경로 보호 설정을 확인한 뒤 `dist/`와 `api/`를 배포합니다.

배포 단계에는 추가로 `AZURE_DEPLOY_ENABLED` Repository variable을 정확히 `true`로 설정해야 합니다. 이 변수는 아래 선행 작업이 모두 끝나고, 원격 `main`에 배포할 변경을 검토해 게시한 후에만 켭니다.

1. Standard SWA와 Cosmos 데이터베이스/컨테이너가 존재하는지 확인합니다.
2. 로그인용 Entra 웹 앱과 콜백 URI, ID 토큰의 `acct` 클레임을 확인합니다.
3. SWA 서버 환경 변수와 GitHub 배포 secret을 등록합니다.
4. 원격 `main`에 포함된 코드와 설정을 검토합니다.
5. `AZURE_DEPLOY_ENABLED=true`를 설정하고 워크플로 실행 결과를 확인합니다.

변수가 없거나 `true`가 아니면 빌드까지만 수행하고 배포하지 않습니다. 다른 브랜치의 수동 실행은 빌드만 하며 배포하지 않습니다. 현재 이 저장소의 미게시 로컬 변경은 이 절차만으로 원격에 올라가지 않습니다. 공개 ID 외의 인증 비밀은 빌드에 전달하지 않습니다.

## 검증과 장애 대응

### 배포 후 smoke 확인

배포 후 위 사이트 주소에서 다음을 확인하고 결과 및 배포 commit SHA를 운영 기록에 남깁니다.

1. 로그아웃 상태에서 사이트가 Entra 로그인으로 이동하는지 확인합니다. 게임 파일과 API에도 같은 접근 제한을 확인합니다.
2. 회사 테넌트 구성원이 로그인하면 `/.auth/me`에 `grill-member` 역할이 있고 게임이 시작되는지 확인합니다.
3. 저장 데이터 읽기/쓰기, 개인 기록, 리더보드 조회를 확인합니다.
4. 게스트 및 다른 테넌트 계정은 접근 거부되며 다른 계정의 데이터가 반환되지 않습니다.
5. 로컬 설정, 계정별 캐시 분리, 기존 기록 가져오기 안내, 오프라인 저장 대기 및 복구 동작을 확인합니다.

구성원 로그인과 SWA의 클레임 전달을 실제 Azure에서 확인합니다. 게스트 계정으로 로그인하여 게임과 API 접근 차단을 확인합니다.

### 롤백 및 API 장애

- 릴리스 문제는 승인된 배포 commit을 `main`에서 revert하고 워크플로가 이전 코드 버전을 배포하도록 합니다.
- 애플리케이션 롤백을 이유로 Cosmos DB 문서나 데이터베이스를 롤백하지 않습니다.
- API 장애 중 계정의 로컬 진행 기록은 기기에 대기하며 연결 복구 뒤 동기화됩니다. 회사 리더보드는 장애 중 오래된 값이 보이거나 사용할 수 없을 수 있습니다.
- 장애 원인, 영향 시간, 마지막 정상 동기화 시각을 기록하고 복구 후 저장 동기화와 리더보드 조회를 재확인합니다.

### 구성원 데이터 삭제

기본 운영은 퇴사자 계정의 표시 이름과 과거 기록을 보존하는 방식입니다. 승인된 삭제 요청이 있을 때만 관리자 절차로 해당 구성원 데이터를 제거합니다. 자동 계정 폴링이나 관리자 HTTP 삭제 API는 제공하지 않습니다.

1. 로그인 세션에 반환된 SWA 사용자 ID나 운영 기록을 확인하여 삭제 요청 대상과 대조합니다.
2. `pixel-raid/player-saves`에서 파티션 키 `/userId`에 해당하는 저장 문서만 삭제합니다.
3. `pixel-raid/leaderboards`에서 해당 `userId`의 각 항목을 확인하고, 각 문서의 실제 `/boardId` 파티션에서 해당 항목만 삭제합니다.
4. 대상 사용자와 삭제 항목을 재확인하고 다른 구성원 및 다른 프로젝트 데이터가 그대로 있는지 확인합니다.

삭제 전후 대상이 운영 서버 설정에 지정된 공유 Cosmos 계정과 `pixel-raid` 데이터베이스인지 확인합니다.

## 인프라 템플릿 검토

Bicep 문법 검증:

```powershell
az bicep build --file infra/azure/main.bicep
```

향후 인프라 변경 전 what-if 확인:

```powershell
Copy-Item infra/azure/parameters.example.json infra/azure/parameters.local.json
# parameters.local.json에서 REPLACE_WITH_EXISTING_COSMOS_ACCOUNT_NAME을 실제 계정 이름으로 교체합니다.

az deployment group what-if `
  --subscription REPLACE_WITH_AZURE_SUBSCRIPTION_ID `
  --resource-group REPLACE_WITH_AZURE_RESOURCE_GROUP `
  --template-file infra/azure/main.bicep `
  --parameters @infra/azure/parameters.local.json
```

`parameters.local.json`은 `.gitignore`에 포함되어 있어 저장소에 추가하지 않습니다. 예시 파일에는 실제 Cosmos 계정 이름을 넣지 않습니다.

기존 Cosmos 계정이나 다른 리소스의 수정·삭제가 표시되면 배포를 중단하고 템플릿과 매개변수를 검토합니다. 배포 후 현재 리소스 상태는 Azure의 `grill-me-t01-provision` 배포 기록과 Resource Group에서 확인할 수 있습니다.

## 구독 한도 확인 기록

2026-11-23 배포 전 `REPLACE_WITH_AZURE_RESOURCE_GROUP`에는 Free SWA 10개와 Standard SWA 6개가 있었고, 같은 구독의 다른 리소스 그룹에 Standard SWA 1개가 있었습니다. 배포 후에는 리소스 그룹에 Standard 7개, 구독 전체에 Standard 8개가 있습니다. Free SWA 수는 10개 그대로입니다. Free SKU의 11번째 앱 what-if는 `InvalidSkuName`으로 거절되어 새 앱을 Standard로 만들었습니다. 기존 프로젝트 앱은 수정하지 않았습니다.

## 참고 문서

- [Static Web Apps 구성 및 fallback](https://learn.microsoft.com/azure/static-web-apps/configuration)
- [Static Web Apps 플랜](https://learn.microsoft.com/azure/static-web-apps/plans)
- [Static Web Apps 구독 한도](https://learn.microsoft.com/azure/static-web-apps/quotas)
- [Entra 선택적 토큰 클레임](https://learn.microsoft.com/entra/identity-platform/optional-claims-reference)
- [Cosmos DB Free Tier](https://learn.microsoft.com/azure/cosmos-db/free-tier)
- [Cosmos DB NoSQL Bicep 관리](https://learn.microsoft.com/azure/cosmos-db/nosql/manage-with-bicep)
- [Static Web Apps 가격](https://azure.microsoft.com/pricing/details/app-service/static/)
