package io.github.philmingdao.teaware.ui.detail

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.key.*
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import io.github.philmingdao.teaware.data.CatalogItem

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun DetailScreen(
    item: CatalogItem,
    baseUrl: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val focusRequester = remember { FocusRequester() }
    val qrBitmap = remember(item.sourceUrl) { generateQRCode(item.sourceUrl, 200) }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF121212))
            .focusRequester(focusRequester)
            .focusable()
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyDown && event.key == Key.Back) {
                    onBack()
                    true
                } else false
            }
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(48.dp),
            horizontalArrangement = Arrangement.spacedBy(48.dp)
        ) {
            AsyncImage(
                model = item.getFullPosterUrl(baseUrl),
                contentDescription = item.imageAlt,
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
            )

            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(),
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = item.titleChinese,
                        style = MaterialTheme.typography.headlineMedium,
                        color = Color.White
                    )
                    Text(
                        text = item.titleEnglish,
                        style = MaterialTheme.typography.titleLarge,
                        color = Color(0xFFB3B3B3)
                    )
                }

                DetailRow(
                    label = "朝代 Dynasty",
                    value = "${item.dynasty} · ${item.dynastyEnglish}"
                )

                DetailRow(
                    label = "年代 Date",
                    value = item.date
                )

                DetailRow(
                    label = "材质 Material",
                    value = "${item.material} · ${item.materialEnglish}"
                )

                item.kiln?.let { kiln ->
                    DetailRow(
                        label = "窑口 Kiln",
                        value = "${kiln}${item.kilnEnglish?.let { " · $it" } ?: ""}"
                    )
                }

                DetailRow(
                    label = "博物馆 Museum",
                    value = "${item.sourceMuseum}\n${item.sourceMuseumEnglish}"
                )

                DetailRow(
                    label = "馆藏编号 Accession",
                    value = item.accessionNumber
                )

                DetailRow(
                    label = "许可证 License",
                    value = item.license
                )

                item.creditLine?.let { credit ->
                    DetailRow(
                        label = "致谢 Credit",
                        value = credit
                    )
                }

                Spacer(modifier = Modifier.weight(1f))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(24.dp),
                    verticalAlignment = Alignment.Bottom
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        qrBitmap?.let { bitmap ->
                            Image(
                                bitmap = bitmap.asImageBitmap(),
                                contentDescription = "QR Code for source URL",
                                modifier = Modifier
                                    .size(120.dp)
                                    .background(Color.White)
                                    .padding(8.dp)
                            )
                        }
                        Text(
                            text = "扫码查看原始来源\nScan for original",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFF8B7355)
                        )
                    }
                }
            }
        }

        Text(
            text = "Back 返回",
            style = MaterialTheme.typography.labelMedium,
            color = Color.White.copy(alpha = 0.5f),
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(24.dp)
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun DetailRow(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = Color(0xFFC4A77D)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            color = Color.White
        )
    }
}

private fun generateQRCode(content: String, size: Int): Bitmap? {
    return try {
        val writer = QRCodeWriter()
        val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size)
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)
        for (x in 0 until size) {
            for (y in 0 until size) {
                bitmap.setPixel(
                    x, y,
                    if (bitMatrix[x, y]) android.graphics.Color.BLACK
                    else android.graphics.Color.WHITE
                )
            }
        }
        bitmap
    } catch (e: Exception) {
        null
    }
}
