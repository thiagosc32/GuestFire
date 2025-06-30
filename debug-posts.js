const http = require('http');
const fs = require('fs');

// Função para testar a API de posts
function testPostsAPI() {
    // Para testar, você precisa:
    // 1. Abrir o dashboard no navegador
    // 2. Fazer login
    // 3. Abrir o console do navegador (F12)
    // 4. Executar: console.log(localStorage.getItem('token'))
    // 5. Copiar o token e colar abaixo
    
    const token = 'COLE_SEU_TOKEN_AQUI'; // Substitua pelo token do localStorage
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/feed/posts?page=1&limit=5',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log('Status:', res.statusCode);
            
            try {
                const response = JSON.parse(data);
                console.log('\n=== RESPOSTA DA API ===');
                console.log('Success:', response.success);
                
                if (response.posts && response.posts.length > 0) {
                    console.log('\n=== PRIMEIRO POST ===');
                    const firstPost = response.posts[0];
                    
                    console.log('ID:', firstPost.id);
                    console.log('Tipo:', firstPost.type);
                    console.log('Conteúdo:', firstPost.content);
                    console.log('Data criação:', firstPost.created_at);
                    console.log('Nome do autor:', firstPost.author_name);
                    console.log('Foto do autor:', firstPost.author_picture);
                    console.log('É anônimo:', firstPost.is_anonymous);
                    console.log('User ID:', firstPost.user_id);
                    
                    // Testar formatação de data
                    if (firstPost.created_at) {
                        const postDate = new Date(firstPost.created_at);
                        console.log('\n=== TESTE DE DATA ===');
                        console.log('Data original:', firstPost.created_at);
                        console.log('Data parseada:', postDate);
                        console.log('É data válida:', !isNaN(postDate.getTime()));
                        
                        if (!isNaN(postDate.getTime())) {
                            const now = new Date();
                            const diff = now - postDate;
                            const minutes = Math.floor(diff / 60000);
                            console.log('Diferença em minutos:', minutes);
                        }
                    }
                    
                    console.log('\n=== TODOS OS CAMPOS ===');
                    Object.keys(firstPost).forEach(key => {
                        console.log(`${key}:`, firstPost[key]);
                    });
                } else {
                    console.log('Nenhum post encontrado');
                }
                
            } catch (error) {
                console.error('Erro ao fazer parse da resposta:', error);
                console.log('Resposta bruta:', data);
            }
        });
    });

    req.on('error', (error) => {
        console.error('Erro na requisição:', error);
    });

    req.end();
}

// Executar o teste
console.log('Testando API de posts...');
testPostsAPI();