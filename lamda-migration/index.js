const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

// Inicializa o cliente do SSM na mesma região da sua infraestrutura
const ssmClient = new SSMClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
    let connection;

    try {
        console.log("1. Buscando senha do banco no SSM...");
        const command = new GetParameterCommand({
            Name: process.env.SSM_PASSWORD_PATH,
            WithDecryption: true
        });
        const ssmResponse = await ssmClient.send(command);
        const dbPassword = ssmResponse.Parameter.Value;

        console.log("2. Conectando ao MySQL privado...");
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: dbPassword,
            database: process.env.DB_NAME,
            // ATENÇÃO: Essa flag é obrigatória para rodar scripts como o init.sql,
            // pois ele contém vários comandos (CREATE TABLE, INSERT, etc) separados por ;
            multipleStatements: true 
        });

        console.log("3. Lendo o arquivo init.sql...");
        const sqlFilePath = path.join(__dirname, 'init.sql');
        const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

        console.log("4. Executando as queries no banco de dados...");
        await connection.query(sqlQuery);

        console.log("5. Migração concluída com sucesso!");
        
        return {
            statusCode: 200,
            body: JSON.stringify('Migração executada com sucesso!')
        };

    } catch (error) {
        console.error("Erro crítico durante a migração:", error);
        throw error; // Joga o erro para o CloudWatch e marca o Lambda como falho
    } finally {
        if (connection) {
            await connection.end(); // Sempre fecha a conexão para não travar o banco
        }
    }
};