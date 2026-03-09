import "reflect-metadata";
import "dotenv/config";
import { AppDataSource } from "../config/data-source";
import { User } from "../modules/auth/user.entity";
import { Ingredient } from "../modules/ingredients/ingredient.entity";
import { Recipe } from "../modules/recipes/recipe.entity";
import { RecipeIngredient } from "../modules/recipes/recipe-ingredient.entity";
import { Sale } from "../modules/sales/sale.entity";

async function seed() {
  try {
    console.log("🌱 Starting database seed...");

    // Inicializar conexión a la base de datos
    await AppDataSource.initialize();
    console.log("✅ Database connected");

    const userRepository = AppDataSource.getRepository(User);
    const ingredientRepository = AppDataSource.getRepository(Ingredient);
    const recipeRepository = AppDataSource.getRepository(Recipe);
    const recipeIngredientRepository = AppDataSource.getRepository(RecipeIngredient);
    const saleRepository = AppDataSource.getRepository(Sale);

    // 1. Crear usuario de prueba
    console.log("\n📝 Creating test user...");
    let testUser = await userRepository.findOne({
      where: { id: "00000000-0000-0000-0000-000000000001" },
    });

    if (!testUser) {
      testUser = userRepository.create({
        id: "00000000-0000-0000-0000-000000000001",
        deviceInfo: {
          model: "Test Device",
          os: "Android",
          version: "13.0",
        },
      });
      await userRepository.save(testUser);
      console.log("✅ Test user created");
    } else {
      console.log("✅ Test user already exists");
    }

    // 2. Crear ingredientes
    console.log("\n🥘 Creating ingredients...");
    const ingredientsData = [
      {
        name: "Olive Oil (Extra)",
        unit: "L",
        priceUsd: "12.50",
        currentStock: "8.5", // Stock normal
        minStock: "5.0",
        category: "Oils",
      },
      {
        name: "Atlantic Salmon",
        unit: "kg",
        priceUsd: "24.00",
        currentStock: "1.2", // STOCK BAJO (menor que minStock)
        minStock: "2.0",
        category: "Proteins",
      },
      {
        name: "Wheat Flour",
        unit: "kg",
        priceUsd: "5.20",
        currentStock: "6.0", // Stock normal
        minStock: "4.0",
        category: "Grains",
      },
      {
        name: "Fresh Basil",
        unit: "bunch",
        priceUsd: "3.15",
        currentStock: "0.5", // STOCK BAJO (menor que minStock)
        minStock: "2.0",
        category: "Herbs",
      },
      {
        name: "Organic Eggs (30)",
        unit: "carton",
        priceUsd: "8.40",
        currentStock: "4.2", // Stock normal
        minStock: "3.0",
        category: "Dairy",
      },
      {
        name: "Balsamic Vinegar",
        unit: "L",
        priceUsd: "15.00",
        currentStock: "9.5", // Stock normal
        minStock: "5.0",
        category: "Condiments",
      },
      {
        name: "Truffle Oil",
        unit: "ml",
        priceUsd: "45.00",
        currentStock: "0.2", // STOCK BAJO
        minStock: "1.0",
        category: "Oils",
      },
      {
        name: "Parmesan Cheese",
        unit: "kg",
        priceUsd: "18.50",
        currentStock: "1.8", // Stock normal
        minStock: "1.5",
        category: "Dairy",
      },
      {
        name: "Arborio Rice",
        unit: "kg",
        priceUsd: "7.80",
        currentStock: "5.5", // Stock normal
        minStock: "4.0",
        category: "Grains",
      },
      {
        name: "White Wine",
        unit: "L",
        priceUsd: "12.00",
        currentStock: "3.2", // Stock normal
        minStock: "2.0",
        category: "Beverages",
      },
    ];

    const ingredients: Ingredient[] = [];
    for (const data of ingredientsData) {
      let ingredient = await ingredientRepository.findOne({
        where: { name: data.name },
      });

      if (!ingredient) {
        ingredient = ingredientRepository.create(data);
        await ingredientRepository.save(ingredient);
        console.log(`✅ Created ingredient: ${data.name}`);
      } else {
        // Actualizar stock para asegurar que algunos estén bajos
        ingredient.currentStock = data.currentStock;
        ingredient.minStock = data.minStock;
        await ingredientRepository.save(ingredient);
        console.log(`✅ Updated ingredient: ${data.name}`);
      }
      ingredients.push(ingredient);
    }

    // 3. Crear recetas
    console.log("\n🍽️ Creating recipes...");
    const recipesData = [
      {
        name: "Pan-Seared Scallops",
        description: "Delicious seared scallops with lemon butter sauce",
        profitPercentage: "79.00",
        category: "Entrees",
        baseServings: 4,
        notes: "Serve immediately after searing",
        ingredients: [
          { ingredientName: "Olive Oil (Extra)", quantity: "0.1" },
          { ingredientName: "Truffle Oil", quantity: "0.05" },
        ],
      },
      {
        name: "Wagyu Beef Burger",
        description: "Premium wagyu beef burger with special sauce",
        profitPercentage: "55.00",
        category: "Plates",
        baseServings: 1,
        notes: "Cook to medium-rare",
        ingredients: [
          { ingredientName: "Wheat Flour", quantity: "0.2" },
          { ingredientName: "Organic Eggs (30)", quantity: "0.1" },
        ],
      },
      {
        name: "Truffle Risotto",
        description: "Creamy risotto with truffle oil and parmesan",
        profitPercentage: "65.00",
        category: "Plates",
        baseServings: 4,
        notes: "Stir constantly while cooking",
        ingredients: [
          { ingredientName: "Arborio Rice", quantity: "0.4" },
          { ingredientName: "White Wine", quantity: "0.2" },
          { ingredientName: "Parmesan Cheese", quantity: "0.15" },
          { ingredientName: "Olive Oil (Extra)", quantity: "0.05" },
        ],
      },
      {
        name: "Lobster Thermidor",
        description: "Classic French lobster dish",
        profitPercentage: "61.00",
        category: "Entrees",
        baseServings: 2,
        notes: "Use fresh lobster",
        ingredients: [
          { ingredientName: "Atlantic Salmon", quantity: "0.3" },
          { ingredientName: "White Wine", quantity: "0.15" },
        ],
      },
      {
        name: "Chocolate Soufflé",
        description: "Light and airy chocolate dessert",
        profitPercentage: "77.00",
        category: "Desserts",
        baseServings: 4,
        notes: "Serve immediately",
        ingredients: [
          { ingredientName: "Organic Eggs (30)", quantity: "0.3" },
          { ingredientName: "Wheat Flour", quantity: "0.1" },
        ],
      },
      {
        name: "Caesar Salad",
        description: "Classic Caesar salad with homemade dressing",
        profitPercentage: "76.00",
        category: "Plates",
        baseServings: 2,
        notes: "Add croutons just before serving",
        ingredients: [
          { ingredientName: "Fresh Basil", quantity: "0.5" },
          { ingredientName: "Parmesan Cheese", quantity: "0.1" },
          { ingredientName: "Olive Oil (Extra)", quantity: "0.05" },
        ],
      },
    ];

    const recipes: Recipe[] = [];
    for (const data of recipesData) {
      let recipe = await recipeRepository.findOne({
        where: { name: data.name },
      });

      if (!recipe) {
        recipe = recipeRepository.create({
          userId: testUser.id,
          name: data.name,
          description: data.description,
          profitPercentage: data.profitPercentage,
          category: data.category,
          baseServings: data.baseServings,
          notes: data.notes,
        });
        await recipeRepository.save(recipe);

        // Agregar ingredientes a la receta
        for (const ingData of data.ingredients) {
          const ingredient = ingredients.find(
            (ing) => ing.name === ingData.ingredientName
          );
          if (ingredient) {
            const recipeIngredient = recipeIngredientRepository.create({
              recipeId: recipe.id,
              ingredientId: ingredient.id,
              quantity: ingData.quantity,
            });
            await recipeIngredientRepository.save(recipeIngredient);
          }
        }

        console.log(`✅ Created recipe: ${data.name}`);
      } else {
        // Si la receta existe, asegurarse de que tenga ingredientes
        const existingIngredients = await recipeIngredientRepository.find({
          where: { recipeId: recipe.id },
        });
        
        if (existingIngredients.length === 0) {
          // Agregar ingredientes si no tiene
          for (const ingData of data.ingredients) {
            const ingredient = ingredients.find(
              (ing) => ing.name === ingData.ingredientName
            );
            if (ingredient) {
              const recipeIngredient = recipeIngredientRepository.create({
                recipeId: recipe.id,
                ingredientId: ingredient.id,
                quantity: ingData.quantity,
              });
              await recipeIngredientRepository.save(recipeIngredient);
            }
          }
          console.log(`✅ Added ingredients to existing recipe: ${data.name}`);
        } else {
          console.log(`✅ Recipe already exists: ${data.name}`);
        }
      }
      recipes.push(recipe);
    }

    // 4. Crear ventas (algunas de hoy para probar notificaciones de entregas)
    console.log("\n💰 Creating sales...");
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const salesData = [
      // Ventas de hoy (para notificaciones de entregas)
      {
        recipeName: "Truffle Risotto",
        quantity: 3,
        date: today,
        totalUsd: "105.00",
        totalBs: "3780.00",
      },
      {
        recipeName: "Caesar Salad",
        quantity: 5,
        date: today,
        totalUsd: "50.00",
        totalBs: "1800.00",
      },
      {
        recipeName: "Pan-Seared Scallops",
        quantity: 2,
        date: today,
        totalUsd: "88.00",
        totalBs: "3168.00",
      },
      // Ventas de ayer
      {
        recipeName: "Wagyu Beef Burger",
        quantity: 4,
        date: yesterday,
        totalUsd: "74.00",
        totalBs: "2664.00",
      },
      {
        recipeName: "Chocolate Soufflé",
        quantity: 6,
        date: yesterday,
        totalUsd: "84.00",
        totalBs: "3024.00",
      },
    ];

    // Obtener todas las recetas de la BD para asegurar que tenemos los IDs correctos
    const allRecipes = await recipeRepository.find({
      where: { userId: testUser.id },
    });

    for (const saleData of salesData) {
      const recipe = allRecipes.find((r) => r.name === saleData.recipeName);
      if (recipe) {
        // Verificar si ya existe una venta similar (solo por fecha y receta para evitar duplicados)
        const existingSale = await saleRepository.findOne({
          where: {
            recipeId: recipe.id,
            userId: testUser.id,
            date: saleData.date,
          },
        });

        if (!existingSale) {
          const sale = saleRepository.create({
            recipeId: recipe.id,
            userId: testUser.id,
            quantity: saleData.quantity,
            date: saleData.date,
            totalUsd: saleData.totalUsd,
            totalBs: saleData.totalBs,
          });
          await saleRepository.save(sale);
          console.log(
            `✅ Created sale: ${saleData.recipeName} x${saleData.quantity} on ${saleData.date}`
          );
        } else {
          // Actualizar cantidad y total si existe
          existingSale.quantity = saleData.quantity;
          existingSale.totalUsd = saleData.totalUsd;
          existingSale.totalBs = saleData.totalBs;
          await saleRepository.save(existingSale);
          console.log(
            `✅ Updated sale: ${saleData.recipeName} on ${saleData.date}`
          );
        }
      } else {
        console.log(
          `⚠️ Recipe not found: ${saleData.recipeName}, skipping sale`
        );
      }
    }

    console.log("\n✅ Database seed completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - Users: 1`);
    console.log(`   - Ingredients: ${ingredients.length}`);
    console.log(`   - Recipes: ${recipes.length}`);
    console.log(`   - Sales: ${salesData.length}`);
    console.log(
      `\n💡 Tip: Some ingredients have low stock to test notifications!`
    );
    console.log(`   - Atlantic Salmon: ${ingredients.find(i => i.name === "Atlantic Salmon")?.currentStock} ${ingredients.find(i => i.name === "Atlantic Salmon")?.unit} (min: ${ingredients.find(i => i.name === "Atlantic Salmon")?.minStock})`);
    console.log(`   - Fresh Basil: ${ingredients.find(i => i.name === "Fresh Basil")?.currentStock} ${ingredients.find(i => i.name === "Fresh Basil")?.unit} (min: ${ingredients.find(i => i.name === "Fresh Basil")?.minStock})`);
    console.log(`   - Truffle Oil: ${ingredients.find(i => i.name === "Truffle Oil")?.currentStock} ${ingredients.find(i => i.name === "Truffle Oil")?.unit} (min: ${ingredients.find(i => i.name === "Truffle Oil")?.minStock})`);

    await AppDataSource.destroy();
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

seed();
