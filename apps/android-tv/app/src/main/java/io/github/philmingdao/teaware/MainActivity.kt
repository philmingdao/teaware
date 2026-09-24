package io.github.philmingdao.teaware

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.rememberNavController
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Surface
import io.github.philmingdao.teaware.data.CatalogRepository
import io.github.philmingdao.teaware.data.CatalogResult
import io.github.philmingdao.teaware.data.CatalogV1
import io.github.philmingdao.teaware.navigation.TeawareNavHost
import io.github.philmingdao.teaware.ui.components.ErrorScreen
import io.github.philmingdao.teaware.ui.components.LoadingScreen
import io.github.philmingdao.teaware.ui.theme.TeawareTVTheme
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TeawareTVTheme {
                TeawareTVApp()
            }
        }
    }
}

class MainViewModel : ViewModel() {
    private val repository = CatalogRepository()

    private val _catalogState = MutableStateFlow<CatalogResult>(CatalogResult.Loading)
    val catalogState: StateFlow<CatalogResult> = _catalogState.asStateFlow()

    val baseUrl: String
        get() = repository.imageBaseUrl

    init {
        loadCatalog()
    }

    fun loadCatalog() {
        viewModelScope.launch {
            _catalogState.value = CatalogResult.Loading
            _catalogState.value = repository.fetchCatalog()
        }
    }

    override fun onCleared() {
        super.onCleared()
        repository.close()
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TeawareTVApp(
    viewModel: MainViewModel = viewModel()
) {
    val catalogState by viewModel.catalogState.collectAsState()
    val navController = rememberNavController()

    Surface(
        modifier = Modifier.fillMaxSize(),
        shape = MaterialTheme.shapes.extraSmall
    ) {
        when (val state = catalogState) {
            is CatalogResult.Loading -> {
                LoadingScreen()
            }
            is CatalogResult.Error -> {
                ErrorScreen(
                    message = state.message,
                    onRetry = { viewModel.loadCatalog() }
                )
            }
            is CatalogResult.Success -> {
                TeawareNavHost(
                    navController = navController,
                    items = state.catalog.items,
                    baseUrl = viewModel.baseUrl,
                    onRetry = { viewModel.loadCatalog() }
                )
            }
        }
    }
}
