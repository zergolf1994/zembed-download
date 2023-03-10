if test -t 1; then # if terminal
    ncolors=$(which tput > /dev/null && tput colors) # supports color
    if test -n "$ncolors" && test $ncolors -ge 8; then
        termcols=$(tput cols)
        bold="$(tput bold)"
        underline="$(tput smul)"
        standout="$(tput smso)"
        normal="$(tput sgr0)"
        black="$(tput setaf 0)"
        red="$(tput setaf 1)"
        green="$(tput setaf 2)"
        yellow="$(tput setaf 3)"
        blue="$(tput setaf 4)"
        magenta="$(tput setaf 5)"
        cyan="$(tput setaf 6)"
        white="$(tput setaf 7)"
    fi
fi

if [[ ! ${1} ]]; then
    echo "${red}================================================================================${normal}"
    echo -e "  ${bold}${yellow}not slug${normal}"
    echo "${red}================================================================================${normal}"
    exit 1
fi

localhost="127.0.0.1"
data=$(curl -sLf "http://${localhost}/data?slug=${1}" | jq -r ".")
status=$(echo $data | jq -r ".status")
url_cron=$(echo $data | jq -r ".url_cron")
sleep_time=$(grep -m1 -ao '[0-9]' /dev/urandom | sed s/0/10/ | head -n1)
echo "sleep_time = ${sleep_time}"
if [[ $status == "false" ]]; then
    msg=$(echo $data | jq -r ".msg")
    echo "msg = ${msg}"
    if [[ $msg == "video_error" ]]; then
        e_code=$(echo $data | jq -r ".e_code")
        sleep 1
        curl -sS "http://127.0.0.1/error?slug=${1}&e_code=${e_code}"
    else
        sleep 1
        curl -sS "http://127.0.0.1/cancle?slug=${1}"
    fi
    sleep $sleep_time
    if [[ $url_cron != "null" ]]; then
        curl -sS "${url_cron}"
    fi
    exit 1
fi
type=$(echo $data | jq -r ".type")
root_dir=$(echo $data | jq -r ".root_dir")

sudo bash ${root_dir}/shell/updatepercent.sh > /dev/null &

if [[ $type == "gdrive_quality_done" ]]; then
    echo "${type} done"
    sleep 2
    curl -sS "http://127.0.0.1/success-quality?slug=${1}"
    
    if [[ $url_cron != "null" ]]; then
        curl -sS "${url_cron}"
    fi
fi

if [[ $type == "gdrive_quality" ]]; then
    echo "download ${type}"
    quality=$(echo $data | jq ".quality | to_entries | .[].value"  --raw-output)
    outPutPath=$(echo $data | jq ".outPutPath"  --raw-output)
    cookie=$(echo $data | jq ".cookie"  --raw-output)
    vdo=$(echo $data | jq ".vdo")
    speed=$(echo $data | jq ".speed")
    for qua in $quality
    do
        outPut=${outPutPath}/file_${qua}.mp4
        linkDownload=$(echo $vdo | jq -r ".file_${qua}")
        DownloadTXT="${outPutPath}/file_${qua}.txt"
        
        if [[ -f "$outPut" ]]; then
            rm -rf ${outPut}
        fi
        if [[ -f "$DownloadTXT" ]]; then
            rm -rf ${DownloadTXT}
        fi

        if [ "${cookie}" != "null" ]; then
            echo "download ${qua}"
            curl -sS "http://${localhost}/update/task/downloading?quality=${qua}"
            #run check process
            axel -H "Cookie: ${cookie}" -n ${speed} -o "${outPut}" "${linkDownload}" >> ${DownloadTXT} 2>&1
        fi
        sleep $sleep_time
        
        curl -sS "http://${localhost}/remote-quality?slug=${1}&quality=${qua}"
    done
    sleep 2
    curl -sS "http://127.0.0.1/success-quality?slug=${1}"
    #download quality success
    sleep $sleep_time
    if [[ $url_cron != "null" ]]; then
        curl -sS "${url_cron}"
    fi
    sleep 1
    echo "download_gdrive_quality_done"
fi

if [[ $type == "gdrive_default" ]]; then
    echo "download ${type}"
    outPutPath=$(echo $data | jq ".outPutPath"  --raw-output)
    outPut="${outPutPath}/file_default"
    linkDownload=$(echo $data | jq -r ".soruce")
    Authorization=$(echo $data | jq -r ".authorization")
    DownloadTXT="${outPutPath}/file_default.txt"
    if [[ -f "$outPut" ]]; then
        rm -rf ${outPut}
    fi
    if [[ -f "$DownloadTXT" ]]; then
        rm -rf ${DownloadTXT}
    fi
    
    data_update_now=$(curl -sLf "http://${localhost}/update/task/downloading?quality=default" | jq ".")
    #echo "data_update_now = ${data_update_now}"
    
    axel -H "Authorization: ${Authorization}" -o "${outPut}" "${linkDownload}" >> ${DownloadTXT} 2>&1

    data_remote=$(curl -sLf "http://${localhost}/remote?slug=${1}" | jq ".")
    remote_status=$(echo $data_remote | jq -r ".status")
    remote_msg=$(echo $data_remote | jq -r ".msg")

    if [[ $remote_msg == "download_error" || $remote_msg == "ffmpeg_error" ]]; then
        remote_ecode=$(echo $data_remote | jq -r ".e_code")
        update_error=$(curl -sLf "http://127.0.0.1/error?slug=${1}&e_code=${remote_ecode}" | jq ".")
        echo "${1} ${remote_msg}"
    else
        sleep 1
        curl -sS "http://127.0.0.1/success-quality?slug=${1}"
        echo "${1} ${remote_msg}"
        sleep $sleep_time
        if [[ $url_cron != "null" ]]; then
            curl -sS "${url_cron}"
        fi
        sleep 1
    fi
    exit 1
fi

if [[ $type == "link_mp4_default" ]]; then

    echo "download ${type}"
    outPutPath=$(echo $data | jq ".outPutPath"  --raw-output)
    speed=$(echo $data | jq ".speed")
    outPut="${outPutPath}/file_default.mp4"
    linkDownload=$(echo $data | jq -r ".soruce")
    DownloadTXT="${outPutPath}/file_default.txt"
    if [[ -f "$outPut" ]]; then
        rm -rf ${outPut}
    fi
    if [[ -f "$DownloadTXT" ]]; then
        rm -rf ${DownloadTXT}
    fi
    curl -sS "http://${localhost}/update/task/downloading?quality=default"

    axel -n ${speed} -o "${outPut}" "${linkDownload}" >> ${DownloadTXT} 2>&1
    
    curl -sS "http://${localhost}/remote?slug=${1}"
    
    sleep $sleep_time
    if [[ $url_cron != "null" ]]; then
        curl -sS "${url_cron}"
    fi
    sleep 1
    echo "download_${type}_done"
fi

if [[ $type == "download_backup" ]]; then
    quality=$(echo $data | jq ".quality | to_entries | .[].value"  --raw-output)
    outPutPath=$(echo $data | jq ".outPutPath"  --raw-output)
    Authorization=$(echo $data | jq -r ".authorization")
    vdo=$(echo $data | jq ".vdo")
    speed=$(echo $data | jq ".speed")
    
    for qua in $quality
    do
        if [[ $qua == "default" ]]; then
            outPut=${outPutPath}/file_default
            DownloadTXT="${outPutPath}/file_default.txt"
        else
            outPut=${outPutPath}/file_${qua}.mp4
            DownloadTXT="${outPutPath}/file_${qua}.txt"
        fi
        linkDownload=$(echo $vdo | jq -r ".file_${qua}")
        DownloadTXT="${outPutPath}/file_${qua}.txt"
        
        if [[ -f "$outPut" ]]; then
            rm -rf ${outPut}
        fi
        if [[ -f "$DownloadTXT" ]]; then
            rm -rf ${DownloadTXT}
        fi

        if [ "${cookie}" != "null" ]; then
            echo "download ${qua}"
            curl -sS "http://${localhost}/update/task/downloading?quality=${qua}"
            #run check process
            axel -H "Authorization: ${Authorization}" -o "${outPut}" "${linkDownload}" >> ${DownloadTXT} 2>&1
        fi
        sleep $sleep_time
        if [[ $qua == "default" ]]; then
            echo "remote default"
            curl -sS "http://${localhost}/remote?slug=${1}"
        else
            curl -sS "http://${localhost}/remote-quality?slug=${1}&quality=${qua}"
        fi
    done
    sleep 2
    curl -sS "http://127.0.0.1/success-quality?slug=${1}"
    #download quality success
    sleep $sleep_time
    if [[ $url_cron != "null" ]]; then
        curl -sS "${url_cron}"
    fi
    sleep 1
    echo "download_backup_done"
fi
exit 1