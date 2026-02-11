# Templates de Email para o Clerk (Formato Personalizado)

Use estes templates no dashboard do Clerk (**Configure > Customization > Email Templates**).
Este formato utiliza a sintaxe específica de componentes de email do Clerk (`<re-html>`, `<re-block>`, etc.).

## 1. Código de Verificação (Verification Code)
**Nome:** Verification Code
**Assunto:** {{otp_code}} é seu código de verificação do {{app.name}}

```html
<re-html>
  <re-head>
    <re-title>
      {{otp_code}} é seu código de verificação do {{app.name}}
    </re-title>
  </re-head>
  <re-body background-color="#fff" padding="48px 32px 48px 32px">
    <re-preheader>
      Seu código de verificação do {{app.name}}
    </re-preheader>
    <re-header padding="16px 32px">
      <re-text font-size="24px" color="#000000">
        {{> app_logo}}
      </re-text>
    </re-header>
    <re-main background-color="#fff" border-radius="0px">
      <re-block border-radius="0px" align="left" padding="32px 32px 48px 32px" background-color="#ffffff" font-size="14px" font-weight="bold" margin="0" level="h1">
        <re-heading margin="0" level="h1" align="left" color="#000000">
          Código de verificação
        </re-heading>
        <re-text margin="32px 0px 0px 0px" align="left" font-size="14px" color="#000000">
          Digite o seguinte código de verificação quando solicitado:
        </re-text>
        <re-text font-size="40px" margin="16px 0px 0px 0px" color="#000000">
          <b>{{otp_code}}</b>
        </re-text>
        <re-text margin="16px 0px 0px 0px" font-size="14px" color="#000000">
          Para proteger sua conta, não compartilhe este código.
        </re-text>
        <re-text margin="64px 0px 0px 0px" color="#000000" font-size="14px">
          <b>Não solicitou isso?</b>
        </re-text>
        <re-text font-size="14px" margin="4px 0px 0px 0px" color="#000000">
           Este código foi solicitado de <b>{{requested_from}}</b> em <b>{{requested_at}}</b>. Se você não fez esta solicitação, pode ignorar este email com segurança.
        </re-text>
      </re-block>
    </re-main>
  </re-body>
</re-html>
```

## 2. Redefinição de Senha (Reset Password)
**Nome:** Reset Password
**Assunto:** Redefina sua senha do {{app.name}}

```html
<re-html>
  <re-head>
    <re-title>
      Redefina sua senha do {{app.name}}
    </re-title>
  </re-head>
  <re-body background-color="#fff" padding="48px 32px 48px 32px">
    <re-preheader>
      Redefina sua senha do {{app.name}}
    </re-preheader>
    <re-header padding="16px 32px">
      <re-text font-size="24px" color="#000000">
        {{> app_logo}}
      </re-text>
    </re-header>
    <re-main background-color="#fff" border-radius="0px">
      <re-block border-radius="0px" align="left" padding="32px 32px 48px 32px" background-color="#ffffff" font-size="14px" font-weight="bold" margin="0" level="h1">
        <re-heading margin="0" level="h1" align="left" color="#000000">
          Esqueceu sua senha?
        </re-heading>
        <re-text margin="32px 0px 0px 0px" align="left" font-size="14px" color="#000000">
          Recebemos uma solicitação para redefinir a senha da sua conta {{app.name}}.
        </re-text>
        <re-text margin="32px 0px 0px 0px" align="left" font-size="14px" color="#000000">
          Clique no link abaixo para criar uma nova senha:
        </re-text>
        <re-button href="{{action_url}}" background-color="#000000" color="#ffffff" padding="12px 24px" border-radius="4px" margin="16px 0px 0px 0px">
          Redefinir Senha
        </re-button>
        <re-text margin="16px 0px 0px 0px" font-size="14px" color="#000000">
          Se o botão não funcionar, copie e cole este link no seu navegador:
        </re-text>
        <re-text margin="8px 0px 0px 0px" font-size="12px" color="#666666">
          {{action_url}}
        </re-text>
        <re-text margin="64px 0px 0px 0px" color="#000000" font-size="14px">
          <b>Não solicitou isso?</b>
        </re-text>
        <re-text font-size="14px" margin="4px 0px 0px 0px" color="#000000">
           Se você não fez esta solicitação, sua conta está segura e nenhuma ação é necessária.
        </re-text>
      </re-block>
    </re-main>
  </re-body>
</re-html>
```

## 3. Convite de Organização (Organization Invitation)
**Nome:** Organization Invitation
**Assunto:** Você foi convidado para o SimplesZap

```html
<re-html>
  <re-head>
    <re-title>
      Convite para colaborar no {{app.name}}
    </re-title>
  </re-head>
  <re-body background-color="#fff" padding="48px 32px 48px 32px">
    <re-preheader>
      Você foi convidado para o {{app.name}}
    </re-preheader>
    <re-header padding="16px 32px">
      <re-text font-size="24px" color="#000000">
        {{> app_logo}}
      </re-text>
    </re-header>
    <re-main background-color="#fff" border-radius="0px">
      <re-block border-radius="0px" align="left" padding="32px 32px 48px 32px" background-color="#ffffff" font-size="14px" font-weight="bold" margin="0" level="h1">
        <re-heading margin="0" level="h1" align="left" color="#000000">
          Convite para colaborar
        </re-heading>
        <re-text margin="32px 0px 0px 0px" align="left" font-size="14px" color="#000000">
          <b>{{inviter.name}}</b> convidou você para participar da organização <b>{{organization.name}}</b> no {{app.name}}.
        </re-text>
        <re-button href="{{action_url}}" background-color="#000000" color="#ffffff" padding="12px 24px" border-radius="4px" margin="32px 0px 0px 0px">
          Aceitar Convite
        </re-button>
        <re-text margin="64px 0px 0px 0px" color="#000000" font-size="14px">
          <b>Dúvidas?</b>
        </re-text>
        <re-text font-size="14px" margin="4px 0px 0px 0px" color="#000000">
           Se você não esperava este convite, pode ignorar este email.
        </re-text>
      </re-block>
    </re-main>
  </re-body>
</re-html>
```
