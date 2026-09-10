import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarMoeda, type Encomenda } from "./caixadoce-data";

export function gerarPdfOrcamento(encomenda: Encomenda, nomeLoja: string = "CaixaDoce") {
  const doc = new jsPDF();

  // Header / Top banner
  doc.setFillColor(124, 58, 237); // purple-600 #7c3aed
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(nomeLoja, 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const isOrc = encomenda.is_orcamento !== false;
  doc.text(isOrc ? "ORÇAMENTO DE ENCOMENDA" : "COMPROVANTE DE ENCOMENDA", 140, 18);

  // Client info section
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Dados do Cliente & Entrega", 14, 38);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Cliente: ${encomenda.clienteNome || "Não informado"}`, 14, 45);
  doc.text(`WhatsApp: ${encomenda.clienteWhatsapp || "Não informado"}`, 14, 51);
  doc.text(
    `Data Prevista: ${
      encomenda.dataEntrega ? encomenda.dataEntrega.split("-").reverse().join("/") : "A combinar"
    } às ${encomenda.horarioEntrega || "14:00"}`,
    14,
    57
  );
  doc.text(
    `Modalidade: ${
      encomenda.tipoEntrega === "delivery"
        ? `Delivery (${encomenda.enderecoEntrega || "A combinar"})`
        : "Retirada no Balcão"
    }`,
    14,
    63
  );

  let currentY = 69;
  if (encomenda.observacoes) {
    doc.text(`Observações: ${encomenda.observacoes}`, 14, currentY);
    currentY += 6;
  }

  // Items table
  const startY = currentY + 4;

  const tableBody =
    encomenda.itensDetalhes && encomenda.itensDetalhes.length > 0
      ? encomenda.itensDetalhes.map((it: any) => {
          const qtd = it.quantidade || 1;
          const opc =
            (Array.isArray(it.opcoes_selecionadas) && it.opcoes_selecionadas.length > 0
              ? ` (${it.opcoes_selecionadas.map((o: any) => o.nome).join(", ")})`
              : "") || (it.opcaoNome ? ` (${it.opcaoNome})` : "");
          const unit = Number(it.precoUnitario ?? it.preco ?? 0);
          return [
            `${qtd}x`,
            `${it.nome}${opc}`,
            formatarMoeda(unit),
            formatarMoeda(unit * qtd),
          ];
        })
      : [
          [
            "1x",
            encomenda.itens || "Itens da encomenda",
            formatarMoeda(encomenda.valorTotal),
            formatarMoeda(encomenda.valorTotal),
          ],
        ];

  autoTable(doc, {
    startY,
    head: [["Qtd", "Descrição do Item", "Valor Unit.", "Subtotal"]],
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [124, 58, 237],
      textColor: 255,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: "center" },
      1: { cellWidth: 100 },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || startY + 40;

  // Summary box
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);

  if (encomenda.taxaEntrega && encomenda.taxaEntrega > 0) {
    doc.text(`Taxa de Entrega: ${formatarMoeda(encomenda.taxaEntrega)}`, 140, finalY + 8);
    doc.setFontSize(12);
    doc.text(`VALOR TOTAL: ${formatarMoeda(encomenda.valorTotal)}`, 140, finalY + 16);
  } else {
    doc.setFontSize(12);
    doc.text(`VALOR TOTAL: ${formatarMoeda(encomenda.valorTotal)}`, 140, finalY + 10);
  }

  // Footer note
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Documento gerado em ${new Date().toLocaleDateString("pt-BR")} via CaixaDoce — ${nomeLoja}`,
    14,
    285
  );

  const cleanName = (encomenda.clienteNome || "Cliente").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Orcamento_${cleanName}_${Date.now()}.pdf`);
}
