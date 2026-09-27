package io.github.philmingdao.teaware.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import io.github.philmingdao.teaware.data.CatalogItem
import io.github.philmingdao.teaware.ui.detail.DetailScreen
import io.github.philmingdao.teaware.ui.home.HomeScreen
import io.github.philmingdao.teaware.ui.settings.SettingsScreen
import io.github.philmingdao.teaware.ui.slideshow.SlideshowScreen

sealed class Screen(val route: String) {
    data object Home : Screen("home")
    data object Slideshow : Screen("slideshow/{startIndex}") {
        fun createRoute(startIndex: Int) = "slideshow/$startIndex"
    }
    data object Detail : Screen("detail/{itemId}") {
        fun createRoute(itemId: String) = "detail/$itemId"
    }
    data object Settings : Screen("settings")
}

@Composable
fun TeawareNavHost(
    navController: NavHostController = rememberNavController(),
    items: List<CatalogItem>,
    baseUrl: String,
    onRetry: () -> Unit
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Home.route
    ) {
        composable(Screen.Home.route) {
            HomeScreen(
                items = items,
                baseUrl = baseUrl,
                onItemClick = { index ->
                    navController.navigate(Screen.Slideshow.createRoute(index))
                },
                onSettingsClick = {
                    navController.navigate(Screen.Settings.route)
                }
            )
        }

        composable(
            route = Screen.Slideshow.route,
            arguments = listOf(
                navArgument("startIndex") { type = NavType.IntType }
            )
        ) { backStackEntry ->
            val startIndex = backStackEntry.arguments?.getInt("startIndex") ?: 0
            SlideshowScreen(
                items = items,
                startIndex = startIndex,
                baseUrl = baseUrl,
                onDetailClick = { itemId ->
                    navController.navigate(Screen.Detail.createRoute(itemId))
                },
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.Detail.route,
            arguments = listOf(
                navArgument("itemId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val itemId = backStackEntry.arguments?.getString("itemId") ?: ""
            val item = items.find { it.id == itemId }
            if (item != null) {
                DetailScreen(
                    item = item,
                    baseUrl = baseUrl,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        composable(Screen.Settings.route) {
            SettingsScreen(
                onBack = { navController.popBackStack() }
            )
        }
    }
}
